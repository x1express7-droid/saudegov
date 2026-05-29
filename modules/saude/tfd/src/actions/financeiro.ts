'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import {
  createAuditLog,
  gerarUrlDownloadAnexo,
  registrarTramitacao,
  StorageNotFoundError,
  StorageValidationError,
  type PrismaTransactionClient,
} from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import {
  resolveSaldoEstadoAlerta,
  tryNotificarSaldoBaixoAposMutacao,
} from '../utils/saldo-baixo-notificacao'
import {
  decidirPrestacaoContasAgendamentoSchema,
  decidirPrestacaoContasSchema,
  decidirPrestacaoContasViagemNovaSchema,
  enviarPrestacaoContasSchema,
  enviarPrestacaoContasViagemNovaSchema,
  MIN_VALOR_COMPROVANTE,
  registrarDespesaAgendamentoSchema,
  registrarDespesaSchema,
  registrarDespesaTransporteSchema,
  registrarDespesaViagemNovaSchema,
  registrarVisualizacaoComprovanteSchema,
  registrarVisualizacaoComprovanteViagemNovaSchema,
} from '../validators/despesa.schema'
import { buscarItensDespesaDoAgendamento } from '../utils/itens-despesa-agendamento'
import { buscarItensDespesaDaViagemNova } from '../utils/itens-despesa-viagem-nova'
import { estornarMovimentacaoSaldoSchema } from '../validators/financeiro.schema'
import { isTipoMovimentacaoEstornavel } from '../utils/saldo-movimentacao'

const MODULO_TFD = 'saude.tfd'

const SALDOS_PATH = '/saude/tfd/configuracoes/saldos'
const DASHBOARD_TFD_PATH = '/saude/tfd/dashboard'

const MSG_VIAGEM_NAO_ENCONTRADA = 'Viagem não encontrada.'
const MSG_SEGMENTO_NAO_ENCONTRADO =
  'Segmento de deslocamento não encontrado ou não pertence a esta viagem.'
const MSG_VIAGEM_NAO_REALIZADA =
  'Registre o retorno da viagem antes de lançar despesas.'
const MSG_PRESTACAO_NAO_ENCONTRADA =
  'Prestação de contas não encontrada para esta viagem.'
const MSG_PRESTACAO_STATUS_INVALIDO =
  'Só é possível lançar despesas enquanto a prestação está pendente ou foi rejeitada para correção.'
const MSG_VIAGEM_NOVA_NAO_CONCLUIDA =
  'A viagem precisa estar concluída para esta operação.'
const MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA =
  'Prestação de contas não encontrada para esta viagem.'
const MSG_COMPROVANTE_OBRIGATORIO = `Comprovante obrigatório para valores iguais ou superiores a R$ ${MIN_VALOR_COMPROVANTE},00.`
const MSG_COMPROVANTE_NAO_ENCONTRADO =
  'Comprovante não encontrado ou ainda não confirmado no envio.'
const MSG_COMPROVANTE_TIPO_INVALIDO =
  'Comprovante deve ser PDF, JPEG ou PNG (máx. 10 MB).'
const MSG_PRESTACAO_ID_NAO_ENCONTRADA = 'Prestação de contas não encontrada.'
const MSG_PRESTACAO_SEM_VIAGEM_LEGADA =
  'Esta prestação está vinculada a um agendamento; o fluxo financeiro por viagem não se aplica.'
const MSG_PRESTACAO_SEM_AGENDAMENTO =
  'Esta prestação não está vinculada a um agendamento; use o fluxo por viagem.'
const MSG_PRESTACAO_FLUXO_VIAGEM =
  'Esta prestação está vinculada a uma viagem; use o fluxo de prestação por viagem.'
const MSG_AGENDAMENTO_NAO_ENCONTRADO = 'Agendamento não encontrado.'
const MSG_AGENDAMENTO_NAO_REALIZADO =
  'Registre o retorno do agendamento antes de lançar despesas.'
const MSG_TRANSPORTE_NAO_ENCONTRADO = 'Segmento de transporte não encontrado.'
const MSG_SOLICITACAO_STATUS_INVALIDO_ENVIO =
  'A solicitação precisa estar aguardando prestação de contas para enviar.'
const MSG_SEM_ITENS_DESPESA =
  'É necessário lançar pelo menos um item de despesa antes de enviar a prestação.'
const MSG_ITEM_SEM_COMPROVANTE =
  'Existem itens com valor igual ou superior a R$ 50,00 sem comprovante anexado.'
const MSG_PRESTACAO_ANALISE_APENAS =
  'A prestação precisa estar enviada e a solicitação em análise financeira para visualizar comprovantes.'
const MSG_COMPROVANTE_NAO_PERTENCE_PRESTACAO =
  'O comprovante não pertence a um item de despesa desta prestação.'
const MSG_PRESTACAO_ENVIADA_APENAS =
  'A prestação precisa estar enviada para análise financeira.'
const MSG_COMPROVANTES_NAO_VISUALIZADOS =
  'Visualize todos os comprovantes antes de aprovar a prestação.'
const MSG_RESERVA_NAO_ENCONTRADA =
  'Reserva financeira ativa não encontrada para esta solicitação.'
const MSG_TRANSICAO_INVALIDA = 'Transição inválida.'
const MSG_MOVIMENTACAO_NAO_ENCONTRADA = 'Movimentação não encontrada.'
const MSG_SALDO_INATIVO = 'Não é possível estornar movimentações de saldo inativo.'
const MSG_MOVIMENTACAO_JA_ESTORNADA = 'Esta movimentação já possui estorno registrado.'
const MSG_TIPO_NAO_ESTORNAVEL =
  'Este tipo de movimentação não pode ser estornado pelo sistema.'
const MSG_NAO_ESTORNAR_ESTORNO = 'Não é permitido estornar um registro de estorno.'

const COMPROVANTE_DOWNLOAD_EXPIRES_MINUTES = 15

const MIME_COMPROVANTE_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

class FinanceiroBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FinanceiroBusinessError'
  }
}

function exigeComprovante(valor: number): boolean {
  return valor >= MIN_VALOR_COMPROVANTE
}

function formatValorBrl(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

type ItemDespesaValidacao = {
  valor: { toString(): string } | number
  comprovante_anexo_id: string | null
}

interface ComprovanteVistoRegistro {
  comprovanteAnexoId: string
  userId: string
  visualizadoAt: string
}

function isComprovanteVistoRegistro(value: unknown): value is ComprovanteVistoRegistro {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const registro = value as Record<string, unknown>
  return (
    typeof registro.comprovanteAnexoId === 'string' &&
    typeof registro.userId === 'string' &&
    typeof registro.visualizadoAt === 'string'
  )
}

function parseComprovantesVistos(raw: unknown): ComprovanteVistoRegistro[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.filter(isComprovanteVistoRegistro)
}

function upsertComprovanteVisto(
  lista: ComprovanteVistoRegistro[],
  comprovanteAnexoId: string,
  userId: string,
  visualizadoAt: string
): ComprovanteVistoRegistro[] {
  const demais = lista.filter((item) => item.comprovanteAnexoId !== comprovanteAnexoId)
  return [...demais, { comprovanteAnexoId, userId, visualizadoAt }]
}

type SaldoLockedRow = {
  id: string
  valor_total: Prisma.Decimal
}

type ReservaLockedRow = {
  id: string
  saldo_id: string
  valor_estimado: Prisma.Decimal
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

async function lockSaldoForUpdate(
  tx: Prisma.TransactionClient,
  tenantId: string,
  saldoId: string
): Promise<SaldoLockedRow | null> {
  const rows = await tx.$queryRaw<SaldoLockedRow[]>(
    Prisma.sql`
      SELECT id, valor_total
      FROM saude_tfd.saldos
      WHERE id = ${saldoId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND ativo = true
      FOR UPDATE
    `
  )

  return rows[0] ?? null
}

async function lockReservaForUpdate(
  tx: Prisma.TransactionClient,
  tenantId: string,
  solicitacaoId: string
): Promise<ReservaLockedRow | null> {
  const rows = await tx.$queryRaw<ReservaLockedRow[]>(
    Prisma.sql`
      SELECT id, saldo_id, valor_estimado
      FROM saude_tfd.reservas_saldo
      WHERE solicitacao_id = ${solicitacaoId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND status = 'ATIVA'
      FOR UPDATE
    `
  )

  return rows[0] ?? null
}

function assertTodosComprovantesVisualizados(
  itens: { comprovante_anexo_id: string | null }[],
  comprovantesVistos: ComprovanteVistoRegistro[]
): void {
  const vistosIds = new Set(comprovantesVistos.map((item) => item.comprovanteAnexoId))

  const naoVisualizado = itens.find(
    (item) => item.comprovante_anexo_id && !vistosIds.has(item.comprovante_anexo_id)
  )

  if (naoVisualizado) {
    throw new FinanceiroBusinessError(MSG_COMPROVANTES_NAO_VISUALIZADOS)
  }
}

function validarItensDespesaComComprovante(itens: ItemDespesaValidacao[]): void {
  if (itens.length === 0) {
    throw new FinanceiroBusinessError(MSG_SEM_ITENS_DESPESA)
  }

  const itemSemComprovante = itens.find(
    (item) => exigeComprovante(Number(item.valor)) && !item.comprovante_anexo_id
  )

  if (itemSemComprovante) {
    throw new FinanceiroBusinessError(MSG_ITEM_SEM_COMPROVANTE)
  }
}

async function validarComprovanteAnexo(
  tx: PrismaTransactionClient,
  tenantId: string,
  comprovanteAnexoId: string
): Promise<void> {
  const anexo = await tx.anexo.findFirst({
    where: {
      id: comprovanteAnexoId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      confirmado: true,
      mime_type: true,
      tamanho_bytes: true,
    },
  })

  if (!anexo || !anexo.confirmado) {
    throw new FinanceiroBusinessError(MSG_COMPROVANTE_NAO_ENCONTRADO)
  }

  if (!MIME_COMPROVANTE_PERMITIDOS.has(anexo.mime_type)) {
    throw new FinanceiroBusinessError(MSG_COMPROVANTE_TIPO_INVALIDO)
  }

  const tamanhoBytes = Number(anexo.tamanho_bytes)
  if (tamanhoBytes > 10 * 1024 * 1024) {
    throw new FinanceiroBusinessError(MSG_COMPROVANTE_TIPO_INVALIDO)
  }
}

export async function registrarDespesa(
  rawInput: unknown
): Promise<ActionResponse<{ despesaId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.REGISTRAR_DESPESA)

  const parsed = registrarDespesaSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  if (exigeComprovante(data.valor) && !data.comprovanteAnexoId) {
    return {
      success: false,
      error: MSG_COMPROVANTE_OBRIGATORIO,
      fieldErrors: {
        comprovanteAnexoId: [MSG_COMPROVANTE_OBRIGATORIO],
      },
    }
  }

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const viagem = await db.tfdViagemLegado.findFirst({
      where: {
        id: data.viagemId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        prestacao_conta: {
          select: {
            id: true,
            status: true,
          },
        },
        solicitacao: {
          select: {
            id: true,
            processo_id: true,
            processo: { select: { protocolo: true } },
          },
        },
      },
    })

    if (!viagem) {
      return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
    }

    if (viagem.status !== 'REALIZADA') {
      return { success: false, error: MSG_VIAGEM_NAO_REALIZADA }
    }

    if (!viagem.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_NAO_ENCONTRADA }
    }

    const statusPrestacao = viagem.prestacao_conta.status
    if (statusPrestacao !== 'PENDENTE' && statusPrestacao !== 'REJEITADA') {
      return { success: false, error: MSG_PRESTACAO_STATUS_INVALIDO }
    }

    const resultado = await db.$transaction(async (tx) => {
      const viagemLocked = await tx.tfdViagemLegado.findFirst({
        where: {
          id: data.viagemId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          prestacao_conta: {
            select: {
              id: true,
              status: true,
            },
          },
          solicitacao: {
            select: {
              id: true,
              processo_id: true,
            },
          },
        },
      })

      if (!viagemLocked) {
        throw new FinanceiroBusinessError(MSG_VIAGEM_NAO_ENCONTRADA)
      }

      if (viagemLocked.status !== 'REALIZADA') {
        throw new FinanceiroBusinessError(MSG_VIAGEM_NAO_REALIZADA)
      }

      if (!viagemLocked.prestacao_conta) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_NAO_ENCONTRADA)
      }

      const statusPc = viagemLocked.prestacao_conta.status
      if (statusPc !== 'PENDENTE' && statusPc !== 'REJEITADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_STATUS_INVALIDO)
      }

      if (exigeComprovante(data.valor) && !data.comprovanteAnexoId) {
        throw new FinanceiroBusinessError(MSG_COMPROVANTE_OBRIGATORIO)
      }

      if (data.comprovanteAnexoId) {
        await validarComprovanteAnexo(tx, tenantId, data.comprovanteAnexoId)
      }

      const item = await tx.tfdItemDespesa.create({
        data: {
          tenant_id: tenantId,
          viagem_id: viagemLocked.id,
          tipo: data.tipo,
          descricao: data.descricao?.trim() || null,
          valor: data.valor,
          comprovante_anexo_id: data.comprovanteAnexoId ?? null,
          responsavel_pagamento: data.responsavelPagamento,
        },
        select: { id: true },
      })

      return {
        despesaId: item.id,
        viagemId: viagemLocked.id,
        prestacaoId: viagemLocked.prestacao_conta.id,
        solicitacaoId: viagemLocked.solicitacao.id,
        processoId: viagemLocked.solicitacao.processo_id,
        tipo: data.tipo,
        valor: data.valor,
        possuiComprovante: Boolean(data.comprovanteAnexoId),
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_item_despesa',
      entidadeId: resultado.despesaId,
      payloadDepois: {
        viagemId: resultado.viagemId,
        prestacaoId: resultado.prestacaoId,
        tipo: resultado.tipo,
        valor: resultado.valor,
        possuiComprovante: resultado.possuiComprovante,
        protocolo: viagem.solicitacao.processo.protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidatePath('/saude/tfd')
    revalidatePath(`/saude/tfd/${resultado.solicitacaoId}`)

    return {
      success: true,
      data: { despesaId: resultado.despesaId },
    }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarDespesa] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a despesa. Tente novamente.',
    }
  }
}

export async function enviarPrestacaoContas(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ENVIAR_PRESTACAO)

  const parsed = enviarPrestacaoContasSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const prestacao = await db.tfdPrestacaoConta.findFirst({
      where: {
        id: data.prestacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        viagem: {
          select: {
            id: true,
            sequencia: true,
            itens_despesa: {
              select: {
                valor: true,
                comprovante_anexo_id: true,
              },
            },
            solicitacao: {
              select: {
                id: true,
                status: true,
                urgencia: true,
                processo_id: true,
                processo: { select: { protocolo: true } },
                especialidade: { select: { nome: true } },
              },
            },
          },
        },
      },
    })

    if (!prestacao) {
      return { success: false, error: MSG_PRESTACAO_ID_NAO_ENCONTRADA }
    }

    if (!prestacao.viagem) {
      return { success: false, error: MSG_PRESTACAO_SEM_VIAGEM_LEGADA }
    }
    const viagem = prestacao.viagem

    const statusPc = prestacao.status
    if (statusPc !== 'PENDENTE' && statusPc !== 'REJEITADA') {
      return { success: false, error: MSG_PRESTACAO_STATUS_INVALIDO }
    }

    if (viagem.solicitacao.status !== 'AGUARDANDO_PC') {
      return { success: false, error: MSG_SOLICITACAO_STATUS_INVALIDO_ENVIO }
    }

    try {
      validarItensDespesaComComprovante(viagem.itens_despesa)
    } catch (error) {
      if (error instanceof FinanceiroBusinessError) {
        return { success: false, error: error.message }
      }
      throw error
    }

    const protocolo = viagem.solicitacao.processo.protocolo
    const especialidadeNome = viagem.solicitacao.especialidade?.nome ?? 'Não informada'

    const resultado = await db.$transaction(async (tx) => {
      const prestacaoLocked = await tx.tfdPrestacaoConta.findFirst({
        where: {
          id: data.prestacaoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          viagem: {
            select: {
              id: true,
              sequencia: true,
              itens_despesa: {
                select: {
                  valor: true,
                  comprovante_anexo_id: true,
                },
              },
              solicitacao: {
                select: {
                  id: true,
                  status: true,
                  processo_id: true,
                },
              },
            },
          },
        },
      })

      if (!prestacaoLocked) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ID_NAO_ENCONTRADA)
      }

      if (!prestacaoLocked.viagem) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_SEM_VIAGEM_LEGADA)
      }
      const viagemLocked = prestacaoLocked.viagem

      const statusLocked = prestacaoLocked.status
      if (statusLocked !== 'PENDENTE' && statusLocked !== 'REJEITADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_STATUS_INVALIDO)
      }

      if (viagemLocked.solicitacao.status !== 'AGUARDANDO_PC') {
        throw new FinanceiroBusinessError(MSG_SOLICITACAO_STATUS_INVALIDO_ENVIO)
      }

      validarItensDespesaComComprovante(viagemLocked.itens_despesa)

      const valorTotal = viagemLocked.itens_despesa.reduce(
        (acc, item) => acc + Number(item.valor),
        0
      )

      await tx.tfdPrestacaoConta.update({
        where: { id: prestacaoLocked.id },
        data: {
          status: 'ENVIADA',
          comprovantes_vistos: [],
          observacoes_gestor: null,
        },
      })

      await tx.tfdSolicitacao.update({
        where: { id: viagemLocked.solicitacao.id },
        data: { status: 'PC_EM_ANALISE' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagemLocked.solicitacao.processo_id,
          tipo: 'PRESTACAO_ENVIADA',
          descricao: `Prestação de contas da viagem ${viagemLocked.sequencia} enviada para análise (total ${formatValorBrl(valorTotal)}).`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: prestacaoLocked.id,
            viagemId: viagemLocked.id,
            valorTotal,
            quantidadeItens: viagemLocked.itens_despesa.length,
          },
        },
        tx
      )

      return {
        prestacaoId: prestacaoLocked.id,
        solicitacaoId: viagemLocked.solicitacao.id,
        processoId: viagemLocked.solicitacao.processo_id,
        sequenciaViagem: viagemLocked.sequencia,
        valorTotal,
        quantidadeItens: viagemLocked.itens_despesa.length,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadDepois: {
        statusPrestacao: 'ENVIADA',
        statusSolicitacao: 'PC_EM_ANALISE',
        valorTotal: resultado.valorTotal,
        quantidadeItens: resultado.quantidadeItens,
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.PRESTACAO_ENVIADA,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo,
        especialidade: especialidadeNome,
        sequenciaViagem: resultado.sequenciaViagem,
        valorTotalFormatado: formatValorBrl(resultado.valorTotal),
      },
      excludeUserIds: [session.user.id],
    })

    revalidatePath('/saude/tfd')
    revalidatePath('/saude/tfd/prestacoes')
    revalidatePath(`/saude/tfd/${resultado.solicitacaoId}`)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[enviarPrestacaoContas] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível enviar a prestação de contas. Tente novamente.',
    }
  }
}

export async function registrarVisualizacaoComprovante(
  rawInput: unknown
): Promise<ActionResponse<{ url: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')

  await requirePermission(session, TFD_PERMISSIONS.APROVAR_PRESTACAO)

  const parsed = registrarVisualizacaoComprovanteSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const userId = session.user.id
    const db = await getPrismaForTenant(tenantId)

    const prestacao = await db.tfdPrestacaoConta.findFirst({
      where: {
        id: data.prestacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        comprovantes_vistos: true,
        viagem: {
          select: {
            id: true,
            solicitacao: {
              select: {
                id: true,
                status: true,
                processo_id: true,
                processo: { select: { protocolo: true } },
              },
            },
          },
        },
      },
    })

    if (!prestacao) {
      return { success: false, error: MSG_PRESTACAO_ID_NAO_ENCONTRADA }
    }

    if (!prestacao.viagem) {
      return { success: false, error: MSG_PRESTACAO_SEM_VIAGEM_LEGADA }
    }
    const viagem = prestacao.viagem

    if (
      prestacao.status !== 'ENVIADA' ||
      viagem.solicitacao.status !== 'PC_EM_ANALISE'
    ) {
      return { success: false, error: MSG_PRESTACAO_ANALISE_APENAS }
    }

    const visualizadoAt = new Date().toISOString()

    const resultado = await db.$transaction(async (tx) => {
      const prestacaoLocked = await tx.tfdPrestacaoConta.findFirst({
        where: {
          id: data.prestacaoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          comprovantes_vistos: true,
          viagem_id: true,
          viagem: {
            select: {
              id: true,
              solicitacao: {
                select: {
                  id: true,
                  status: true,
                  processo_id: true,
                },
              },
            },
          },
        },
      })

      if (!prestacaoLocked) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ID_NAO_ENCONTRADA)
      }

      if (!prestacaoLocked.viagem) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_SEM_VIAGEM_LEGADA)
      }
      const viagemLocked = prestacaoLocked.viagem

      if (prestacaoLocked.status !== 'ENVIADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ANALISE_APENAS)
      }

      if (viagemLocked.solicitacao.status !== 'PC_EM_ANALISE') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ANALISE_APENAS)
      }

      const itemDespesa = await tx.tfdItemDespesa.findFirst({
        where: {
          tenant_id: tenantId,
          viagem_id: viagemLocked.id,
          comprovante_anexo_id: data.comprovanteAnexoId,
        },
        select: { id: true },
      })

      if (!itemDespesa) {
        throw new FinanceiroBusinessError(MSG_COMPROVANTE_NAO_PERTENCE_PRESTACAO)
      }

      const comprovantesAtualizados = upsertComprovanteVisto(
        parseComprovantesVistos(prestacaoLocked.comprovantes_vistos),
        data.comprovanteAnexoId,
        userId,
        visualizadoAt
      )

      await tx.tfdPrestacaoConta.update({
        where: { id: prestacaoLocked.id },
        data: {
          comprovantes_vistos: JSON.parse(
            JSON.stringify(comprovantesAtualizados)
          ) as Prisma.InputJsonValue,
        },
      })

      return {
        prestacaoId: prestacaoLocked.id,
        solicitacaoId: viagemLocked.solicitacao.id,
        processoId: viagemLocked.solicitacao.processo_id,
        quantidadeVistos: comprovantesAtualizados.length,
      }
    })

    const { url } = await gerarUrlDownloadAnexo(
      {
        tenantId,
        anexoId: data.comprovanteAnexoId,
        downloadExpiresInMinutes: COMPROVANTE_DOWNLOAD_EXPIRES_MINUTES,
      },
      db
    )

    await createAuditLog({
      tenantId,
      userId,
      acao: 'READ_SENSITIVE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadDepois: {
        prestacaoId: resultado.prestacaoId,
        comprovanteAnexoId: data.comprovanteAnexoId,
        visualizadoAt,
        quantidadeComprovantesVistos: resultado.quantidadeVistos,
        protocolo: viagem.solicitacao.processo.protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidatePath('/saude/tfd')
    revalidatePath('/saude/tfd/prestacoes')
    revalidatePath(`/saude/tfd/${resultado.solicitacaoId}`)

    return {
      success: true,
      data: { url },
    }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    if (error instanceof StorageNotFoundError) {
      return { success: false, error: MSG_COMPROVANTE_NAO_ENCONTRADO }
    }

    if (error instanceof StorageValidationError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarVisualizacaoComprovante] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a visualização do comprovante. Tente novamente.',
    }
  }
}

export async function decidirPrestacaoContas(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')

  await requirePermission(session, TFD_PERMISSIONS.APROVAR_PRESTACAO)

  const parsed = decidirPrestacaoContasSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const prestacao = await db.tfdPrestacaoConta.findFirst({
      where: {
        id: data.prestacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        comprovantes_vistos: true,
        viagem: {
          select: {
            id: true,
            sequencia: true,
            itens_despesa: {
              select: {
                valor: true,
                comprovante_anexo_id: true,
              },
            },
            solicitacao: {
              select: {
                id: true,
                status: true,
                solicitante_id: true,
                processo_id: true,
                processo: {
                  select: {
                    protocolo: true,
                    aberto_por_id: true,
                  },
                },
                especialidade: { select: { nome: true } },
              },
            },
          },
        },
      },
    })

    if (!prestacao) {
      return { success: false, error: MSG_PRESTACAO_ID_NAO_ENCONTRADA }
    }

    if (!prestacao.viagem) {
      return { success: false, error: MSG_PRESTACAO_SEM_VIAGEM_LEGADA }
    }
    const viagem = prestacao.viagem

    if (prestacao.status !== 'ENVIADA') {
      return { success: false, error: MSG_PRESTACAO_ENVIADA_APENAS }
    }

    if (viagem.solicitacao.status !== 'PC_EM_ANALISE') {
      return { success: false, error: MSG_TRANSICAO_INVALIDA }
    }

    const protocolo = viagem.solicitacao.processo.protocolo
    const especialidadeNome =
      viagem.solicitacao.especialidade?.nome ?? 'Não informada'
    const servidorResponsavelId =
      viagem.solicitacao.processo.aberto_por_id ?? viagem.solicitacao.solicitante_id
    const decididoAt = new Date()

    if (!data.aprovado) {
      const observacoesGestor = data.observacoesGestor!.trim()

      const resultado = await db.$transaction(async (tx) => {
        const prestacaoLocked = await tx.tfdPrestacaoConta.findFirst({
          where: {
            id: data.prestacaoId,
            tenant_id: tenantId,
          },
          select: {
            id: true,
            status: true,
            viagem: {
              select: {
                id: true,
                sequencia: true,
                solicitacao: {
                  select: {
                    id: true,
                    status: true,
                    processo_id: true,
                  },
                },
              },
            },
          },
        })

        if (!prestacaoLocked) {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_ID_NAO_ENCONTRADA)
        }

        if (prestacaoLocked.status !== 'ENVIADA') {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_ENVIADA_APENAS)
        }

        if (!prestacaoLocked.viagem) {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_SEM_VIAGEM_LEGADA)
        }
        const viagemLocked = prestacaoLocked.viagem

        if (viagemLocked.solicitacao.status !== 'PC_EM_ANALISE') {
          throw new FinanceiroBusinessError(MSG_TRANSICAO_INVALIDA)
        }

        await tx.tfdPrestacaoConta.update({
          where: { id: prestacaoLocked.id },
          data: {
            status: 'REJEITADA',
            observacoes_gestor: observacoesGestor,
            aprovado_por_id: session.user.id,
            aprovado_at: decididoAt,
          },
        })

        await tx.tfdSolicitacao.update({
          where: { id: viagemLocked.solicitacao.id },
          data: { status: 'AGUARDANDO_PC' },
        })

        await registrarTramitacao(
          {
            tenantId,
            processoId: viagemLocked.solicitacao.processo_id,
            tipo: 'PRESTACAO_REJEITADA',
            descricao: `Prestação de contas da viagem ${viagemLocked.sequencia} rejeitada. ${observacoesGestor}`,
            usuarioId: session.user.id,
            metadata: {
              prestacaoId: prestacaoLocked.id,
              viagemId: viagemLocked.id,
            },
          },
          tx
        )

        return {
          prestacaoId: prestacaoLocked.id,
          solicitacaoId: viagemLocked.solicitacao.id,
          processoId: viagemLocked.solicitacao.processo_id,
          sequenciaViagem: viagemLocked.sequencia,
        }
      })

      await createAuditLog({
        tenantId,
        userId: session.user.id,
        acao: 'UPDATE',
        entidade: 'saude_tfd_prestacao_conta',
        entidadeId: resultado.prestacaoId,
        payloadAntes: { statusPrestacao: 'ENVIADA', statusSolicitacao: 'PC_EM_ANALISE' },
        payloadDepois: {
          statusPrestacao: 'REJEITADA',
          statusSolicitacao: 'AGUARDANDO_PC',
          aprovado: false,
          protocolo,
          modulo: MODULO_TFD,
          processoId: resultado.processoId,
        },
      })

      if (servidorResponsavelId) {
        await dispararNotificacao({
          tenantId,
          evento: NOTIFICATION_EVENTS.PRESTACAO_REJEITADA,
          modulo: MODULO_TFD,
          processoId: resultado.processoId,
          context: {
            protocolo,
            especialidade: especialidadeNome,
            sequenciaViagem: resultado.sequenciaViagem,
            observacoesGestor,
          },
          recipientUserIds: [servidorResponsavelId],
          excludeUserIds: [session.user.id],
        })
      }

      revalidatePath('/saude/tfd')
      revalidatePath('/saude/tfd/prestacoes')
      revalidatePath(`/saude/tfd/${resultado.solicitacaoId}`)

      return { success: true, data: undefined }
    }

    const comprovantesVistos = parseComprovantesVistos(prestacao.comprovantes_vistos)

    try {
      assertTodosComprovantesVisualizados(viagem.itens_despesa, comprovantesVistos)
    } catch (error) {
      if (error instanceof FinanceiroBusinessError) {
        return { success: false, error: error.message }
      }
      throw error
    }

    const reservaAtiva = await db.tfdReservaSaldo.findFirst({
      where: {
        tenant_id: tenantId,
        solicitacao_id: viagem.solicitacao.id,
        status: 'ATIVA',
      },
      select: { saldo_id: true },
    })

    const saldoIdAfetado = reservaAtiva?.saldo_id ?? null
    let jaEstavaEmAlertaBaixo = false

    if (saldoIdAfetado) {
      const estadoSaldoAntes = await resolveSaldoEstadoAlerta(db, tenantId, saldoIdAfetado)
      jaEstavaEmAlertaBaixo = estadoSaldoAntes?.alertaBaixo ?? false
    }

    const resultado = await db.$transaction(async (tx) => {
      const prestacaoLocked = await tx.tfdPrestacaoConta.findFirst({
        where: {
          id: data.prestacaoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          comprovantes_vistos: true,
          viagem: {
            select: {
              id: true,
              sequencia: true,
              itens_despesa: {
                select: {
                  valor: true,
                  comprovante_anexo_id: true,
                },
              },
              solicitacao: {
                select: {
                  id: true,
                  status: true,
                  processo_id: true,
                },
              },
            },
          },
        },
      })

      if (!prestacaoLocked) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ID_NAO_ENCONTRADA)
      }

      if (prestacaoLocked.status !== 'ENVIADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ENVIADA_APENAS)
      }

      if (!prestacaoLocked.viagem) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_SEM_VIAGEM_LEGADA)
      }
      const viagemLocked = prestacaoLocked.viagem

      if (viagemLocked.solicitacao.status !== 'PC_EM_ANALISE') {
        throw new FinanceiroBusinessError(MSG_TRANSICAO_INVALIDA)
      }

      assertTodosComprovantesVisualizados(
        viagemLocked.itens_despesa,
        parseComprovantesVistos(prestacaoLocked.comprovantes_vistos)
      )

      validarItensDespesaComComprovante(viagemLocked.itens_despesa)

      const valorReal = roundMoney(
        viagemLocked.itens_despesa.reduce(
          (acc, item) => acc + Number(item.valor),
          0
        )
      )

      const reservaLocked = await lockReservaForUpdate(
        tx,
        tenantId,
        viagemLocked.solicitacao.id
      )

      if (!reservaLocked) {
        throw new FinanceiroBusinessError(MSG_RESERVA_NAO_ENCONTRADA)
      }

      const saldoLocked = await lockSaldoForUpdate(tx, tenantId, reservaLocked.saldo_id)

      if (!saldoLocked) {
        throw new FinanceiroBusinessError(MSG_RESERVA_NAO_ENCONTRADA)
      }

      const valorReservado = roundMoney(Number(reservaLocked.valor_estimado))
      const valorLiberacao = roundMoney(Math.max(0, valorReservado - valorReal))

      await tx.tfdReservaSaldo.update({
        where: { id: reservaLocked.id },
        data: {
          status: 'CONSUMIDA',
          consumido_at: decididoAt,
        },
      })

      await tx.tfdMovimentacaoSaldo.create({
        data: {
          tenant_id: tenantId,
          saldo_id: reservaLocked.saldo_id,
          tipo: 'CONSUMO',
          valor: valorReal,
          solicitacao_id: viagemLocked.solicitacao.id,
          descricao: 'Consumo — prestação de contas aprovada',
          usuario_id: session.user.id,
        },
      })

      if (valorLiberacao > 0) {
        await tx.tfdMovimentacaoSaldo.create({
          data: {
            tenant_id: tenantId,
            saldo_id: reservaLocked.saldo_id,
            tipo: 'LIBERACAO',
            valor: valorLiberacao,
            solicitacao_id: viagemLocked.solicitacao.id,
            descricao: 'Liberação — diferença entre valor estimado e real da prestação',
            usuario_id: session.user.id,
          },
        })
      }

      await tx.tfdPrestacaoConta.update({
        where: { id: prestacaoLocked.id },
        data: {
          status: 'APROVADA',
          aprovado_por_id: session.user.id,
          aprovado_at: decididoAt,
          observacoes_gestor: data.observacoesGestor?.trim() || null,
        },
      })

      await tx.tfdSolicitacao.update({
        where: { id: viagemLocked.solicitacao.id },
        data: { status: 'CONCLUIDO' },
      })

      await tx.processo.update({
        where: { id: viagemLocked.solicitacao.processo_id },
        data: { status: 'CONCLUIDO' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagemLocked.solicitacao.processo_id,
          tipo: 'PRESTACAO_APROVADA',
          descricao: `Prestação de contas da viagem ${viagemLocked.sequencia} aprovada (total ${formatValorBrl(valorReal)}).`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: prestacaoLocked.id,
            viagemId: viagemLocked.id,
            valorReal,
            valorReservado,
            valorLiberacao,
          },
        },
        tx
      )

      return {
        prestacaoId: prestacaoLocked.id,
        solicitacaoId: viagemLocked.solicitacao.id,
        processoId: viagemLocked.solicitacao.processo_id,
        sequenciaViagem: viagemLocked.sequencia,
        valorReal,
        valorReservado,
        valorLiberacao,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadAntes: { statusPrestacao: 'ENVIADA', statusSolicitacao: 'PC_EM_ANALISE' },
      payloadDepois: {
        statusPrestacao: 'APROVADA',
        statusSolicitacao: 'CONCLUIDO',
        processoStatus: 'CONCLUIDO',
        aprovado: true,
        valorReal: resultado.valorReal,
        valorReservado: resultado.valorReservado,
        valorLiberacao: resultado.valorLiberacao,
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    if (servidorResponsavelId) {
      await dispararNotificacao({
        tenantId,
        evento: NOTIFICATION_EVENTS.PRESTACAO_APROVADA,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
        context: {
          protocolo,
          especialidade: especialidadeNome,
          sequenciaViagem: resultado.sequenciaViagem,
          valorTotalFormatado: formatValorBrl(resultado.valorReal),
        },
        recipientUserIds: [servidorResponsavelId],
        excludeUserIds: [session.user.id],
      })
    }

    if (saldoIdAfetado) {
      await tryNotificarSaldoBaixoAposMutacao({
        tenantId,
        saldoId: saldoIdAfetado,
        jaEstavaEmAlertaBaixo,
        excludeUserIds: [session.user.id],
      })
    }

    revalidatePath('/saude/tfd')
    revalidatePath('/saude/tfd/prestacoes')
    revalidatePath(`/saude/tfd/${resultado.solicitacaoId}`)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[decidirPrestacaoContas] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a decisão da prestação. Tente novamente.',
    }
  }
}

/** Estorno manual de movimentação — novo registro ESTORNO, extrato imutável (§1.8). */
export async function estornarMovimentacaoSaldoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ movimentacaoId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')

  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const parsed = estornarMovimentacaoSaldoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { movimentacaoId, justificativa } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const original = await db.tfdMovimentacaoSaldo.findFirst({
      where: {
        id: movimentacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        saldo_id: true,
        tipo: true,
        valor: true,
        solicitacao_id: true,
        saldo: {
          select: { ativo: true, descricao: true },
        },
      },
    })

    if (!original) {
      return { success: false, error: MSG_MOVIMENTACAO_NAO_ENCONTRADA }
    }

    if (!original.saldo.ativo) {
      return { success: false, error: MSG_SALDO_INATIVO }
    }

    if (original.tipo === 'ESTORNO') {
      return { success: false, error: MSG_NAO_ESTORNAR_ESTORNO }
    }

    if (!isTipoMovimentacaoEstornavel(original.tipo)) {
      return { success: false, error: MSG_TIPO_NAO_ESTORNAVEL }
    }

    const estornoExistente = await db.tfdMovimentacaoSaldo.findFirst({
      where: {
        tenant_id: tenantId,
        movimentacao_origem_id: original.id,
        tipo: 'ESTORNO',
      },
      select: { id: true },
    })

    if (estornoExistente) {
      return { success: false, error: MSG_MOVIMENTACAO_JA_ESTORNADA }
    }

    const valorOriginal = Number(original.valor)
    const valorEstorno = roundMoney(-valorOriginal)

    if (valorEstorno === 0) {
      return {
        success: false,
        error: 'Não é possível estornar movimentação com valor zero.',
      }
    }

    const estadoAntes = await resolveSaldoEstadoAlerta(db, tenantId, original.saldo_id)
    const jaEstavaEmAlertaBaixo = estadoAntes?.alertaBaixo ?? false

    const estorno = await db.$transaction(async (tx) => {
      return tx.tfdMovimentacaoSaldo.create({
        data: {
          tenant_id: tenantId,
          saldo_id: original.saldo_id,
          tipo: 'ESTORNO',
          valor: valorEstorno,
          solicitacao_id: original.solicitacao_id,
          movimentacao_origem_id: original.id,
          descricao: justificativa,
          usuario_id: session.user.id,
        },
        select: { id: true },
      })
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_movimentacao_saldo',
      entidadeId: estorno.id,
      payloadDepois: {
        tipo: 'ESTORNO',
        movimentacaoOrigemId: original.id,
        tipoMovimentacaoOrigem: original.tipo,
        valor: valorEstorno,
        saldoId: original.saldo_id,
      },
    })

    await tryNotificarSaldoBaixoAposMutacao({
      tenantId,
      saldoId: original.saldo_id,
      jaEstavaEmAlertaBaixo,
      excludeUserIds: [session.user.id],
    })

    revalidatePath(SALDOS_PATH)
    revalidatePath(DASHBOARD_TFD_PATH)

    return { success: true, data: { movimentacaoId: estorno.id } }
  } catch (error) {
    console.error('[estornarMovimentacaoSaldoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar o estorno. Tente novamente.',
    }
  }
}

function revalidateAgendamentoFinanceiroPaths(
  processoId: string,
  agendamentoId: string,
  solicitacaoId: string
): void {
  revalidatePath('/saude/tfd')
  revalidatePath('/saude/tfd/agendamentos')
  revalidatePath('/saude/tfd/prestacoes')
  revalidatePath(`/saude/tfd/${solicitacaoId}`)
  revalidatePath(`/saude/tfd/processos/${processoId}/agendamentos/${agendamentoId}`)
}

function extrairSequenciaProtocoloViagemNova(protocolo: string): number {
  const ultimoSegmento = protocolo.split('-').pop()
  const sequencia = Number.parseInt(ultimoSegmento ?? '', 10)
  return Number.isFinite(sequencia) ? sequencia : 1
}

function revalidateViagemNovaFinanceiroPaths(processoId: string, viagemNovaId: string): void {
  revalidatePath('/saude/tfd')
  revalidatePath('/saude/tfd/viagens')
  revalidatePath('/saude/tfd/prestacoes')
  revalidatePath(`/saude/tfd/viagens/${viagemNovaId}`)
  revalidatePath(`/saude/tfd/processos/${processoId}`)
}

export async function registrarDespesaAgendamento(
  rawInput: unknown
): Promise<ActionResponse<{ despesaId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.REGISTRAR_DESPESA)

  const parsed = registrarDespesaAgendamentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  if (exigeComprovante(data.valor) && !data.comprovanteAnexoId) {
    return {
      success: false,
      error: MSG_COMPROVANTE_OBRIGATORIO,
      fieldErrors: {
        comprovanteAnexoId: [MSG_COMPROVANTE_OBRIGATORIO],
      },
    }
  }

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const agendamento = await db.tfdAgendamento.findFirst({
      where: {
        id: data.agendamentoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        processo_id: true,
        sequencia: true,
        prestacao_conta: {
          select: {
            id: true,
            status: true,
          },
        },
        solicitacao: {
          select: {
            id: true,
            processo: { select: { protocolo: true } },
          },
        },
      },
    })

    if (!agendamento) {
      return { success: false, error: MSG_AGENDAMENTO_NAO_ENCONTRADO }
    }

    if (agendamento.status !== 'REALIZADO') {
      return { success: false, error: MSG_AGENDAMENTO_NAO_REALIZADO }
    }

    if (!agendamento.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_NAO_ENCONTRADA }
    }

    const statusPrestacao = agendamento.prestacao_conta.status
    if (statusPrestacao !== 'PENDENTE' && statusPrestacao !== 'REJEITADA') {
      return { success: false, error: MSG_PRESTACAO_STATUS_INVALIDO }
    }

    const resultado = await db.$transaction(async (tx) => {
      const agendamentoLocked = await tx.tfdAgendamento.findFirst({
        where: {
          id: data.agendamentoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          processo_id: true,
          prestacao_conta: {
            select: {
              id: true,
              status: true,
            },
          },
          solicitacao: {
            select: {
              id: true,
              processo_id: true,
            },
          },
        },
      })

      if (!agendamentoLocked) {
        throw new FinanceiroBusinessError(MSG_AGENDAMENTO_NAO_ENCONTRADO)
      }

      if (agendamentoLocked.status !== 'REALIZADO') {
        throw new FinanceiroBusinessError(MSG_AGENDAMENTO_NAO_REALIZADO)
      }

      if (!agendamentoLocked.prestacao_conta) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_NAO_ENCONTRADA)
      }

      const statusPc = agendamentoLocked.prestacao_conta.status
      if (statusPc !== 'PENDENTE' && statusPc !== 'REJEITADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_STATUS_INVALIDO)
      }

      if (exigeComprovante(data.valor) && !data.comprovanteAnexoId) {
        throw new FinanceiroBusinessError(MSG_COMPROVANTE_OBRIGATORIO)
      }

      if (data.comprovanteAnexoId) {
        await validarComprovanteAnexo(tx, tenantId, data.comprovanteAnexoId)
      }

      const item = await tx.tfdItemDespesa.create({
        data: {
          tenant_id: tenantId,
          agendamento_id: agendamentoLocked.id,
          viagem_id: null,
          transporte_id: null,
          tipo: data.tipo,
          descricao: data.descricao?.trim() || null,
          valor: data.valor,
          comprovante_anexo_id: data.comprovanteAnexoId ?? null,
          responsavel_pagamento: data.responsavelPagamento,
        },
        select: { id: true },
      })

      return {
        despesaId: item.id,
        agendamentoId: agendamentoLocked.id,
        prestacaoId: agendamentoLocked.prestacao_conta.id,
        solicitacaoId: agendamentoLocked.solicitacao.id,
        processoId: agendamentoLocked.solicitacao.processo_id,
        tipo: data.tipo,
        valor: data.valor,
        possuiComprovante: Boolean(data.comprovanteAnexoId),
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_item_despesa',
      entidadeId: resultado.despesaId,
      payloadDepois: {
        agendamentoId: resultado.agendamentoId,
        prestacaoId: resultado.prestacaoId,
        tipo: resultado.tipo,
        valor: resultado.valor,
        possuiComprovante: resultado.possuiComprovante,
        protocolo: agendamento.solicitacao.processo.protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidateAgendamentoFinanceiroPaths(
      resultado.processoId,
      resultado.agendamentoId,
      resultado.solicitacaoId
    )

    return {
      success: true,
      data: { despesaId: resultado.despesaId },
    }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarDespesaAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a despesa. Tente novamente.',
    }
  }
}

export async function registrarDespesaTransporte(
  rawInput: unknown
): Promise<ActionResponse<{ despesaId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.REGISTRAR_DESPESA)

  const parsed = registrarDespesaTransporteSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  if (exigeComprovante(data.valor) && !data.comprovanteAnexoId) {
    return {
      success: false,
      error: MSG_COMPROVANTE_OBRIGATORIO,
      fieldErrors: {
        comprovanteAnexoId: [MSG_COMPROVANTE_OBRIGATORIO],
      },
    }
  }

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const transporte = await db.tfdTransporte.findFirst({
      where: {
        id: data.transporteId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        agendamento_id: true,
        agendamento: {
          select: {
            id: true,
            status: true,
            processo_id: true,
            sequencia: true,
            prestacao_conta: {
              select: {
                id: true,
                status: true,
              },
            },
            solicitacao: {
              select: {
                id: true,
                processo: { select: { protocolo: true } },
              },
            },
          },
        },
      },
    })

    if (!transporte) {
      return { success: false, error: MSG_TRANSPORTE_NAO_ENCONTRADO }
    }

    const agendamento = transporte.agendamento

    if (!agendamento) {
      return { success: false, error: MSG_TRANSPORTE_NAO_ENCONTRADO }
    }

    if (agendamento.status !== 'REALIZADO') {
      return { success: false, error: MSG_AGENDAMENTO_NAO_REALIZADO }
    }

    if (!agendamento.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_NAO_ENCONTRADA }
    }

    const statusPrestacao = agendamento.prestacao_conta.status
    if (statusPrestacao !== 'PENDENTE' && statusPrestacao !== 'REJEITADA') {
      return { success: false, error: MSG_PRESTACAO_STATUS_INVALIDO }
    }

    const resultado = await db.$transaction(async (tx) => {
      const transporteLocked = await tx.tfdTransporte.findFirst({
        where: {
          id: data.transporteId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          agendamento: {
            select: {
              id: true,
              status: true,
              processo_id: true,
              prestacao_conta: {
                select: {
                  id: true,
                  status: true,
                },
              },
              solicitacao: {
                select: {
                  id: true,
                  processo_id: true,
                },
              },
            },
          },
        },
      })

      if (!transporteLocked) {
        throw new FinanceiroBusinessError(MSG_TRANSPORTE_NAO_ENCONTRADO)
      }

      const agendamentoLocked = transporteLocked.agendamento

      if (!agendamentoLocked) {
        throw new FinanceiroBusinessError(MSG_TRANSPORTE_NAO_ENCONTRADO)
      }

      if (agendamentoLocked.status !== 'REALIZADO') {
        throw new FinanceiroBusinessError(MSG_AGENDAMENTO_NAO_REALIZADO)
      }

      if (!agendamentoLocked.prestacao_conta) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_NAO_ENCONTRADA)
      }

      const statusPc = agendamentoLocked.prestacao_conta.status
      if (statusPc !== 'PENDENTE' && statusPc !== 'REJEITADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_STATUS_INVALIDO)
      }

      if (exigeComprovante(data.valor) && !data.comprovanteAnexoId) {
        throw new FinanceiroBusinessError(MSG_COMPROVANTE_OBRIGATORIO)
      }

      if (data.comprovanteAnexoId) {
        await validarComprovanteAnexo(tx, tenantId, data.comprovanteAnexoId)
      }

      const item = await tx.tfdItemDespesa.create({
        data: {
          tenant_id: tenantId,
          agendamento_id: agendamentoLocked.id,
          viagem_id: null,
          transporte_id: transporteLocked.id,
          tipo: data.tipo,
          descricao: data.descricao?.trim() || null,
          valor: data.valor,
          comprovante_anexo_id: data.comprovanteAnexoId ?? null,
          responsavel_pagamento: data.responsavelPagamento,
        },
        select: { id: true },
      })

      return {
        despesaId: item.id,
        agendamentoId: agendamentoLocked.id,
        transporteId: transporteLocked.id,
        prestacaoId: agendamentoLocked.prestacao_conta.id,
        solicitacaoId: agendamentoLocked.solicitacao.id,
        processoId: agendamentoLocked.solicitacao.processo_id,
        tipo: data.tipo,
        valor: data.valor,
        possuiComprovante: Boolean(data.comprovanteAnexoId),
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_item_despesa',
      entidadeId: resultado.despesaId,
      payloadDepois: {
        agendamentoId: resultado.agendamentoId,
        transporteId: resultado.transporteId,
        prestacaoId: resultado.prestacaoId,
        tipo: resultado.tipo,
        valor: resultado.valor,
        possuiComprovante: resultado.possuiComprovante,
        protocolo: agendamento.solicitacao.processo.protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidateAgendamentoFinanceiroPaths(
      resultado.processoId,
      resultado.agendamentoId,
      resultado.solicitacaoId
    )

    return {
      success: true,
      data: { despesaId: resultado.despesaId },
    }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarDespesaTransporte] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a despesa. Tente novamente.',
    }
  }
}

export async function enviarPrestacaoContasAgendamento(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ENVIAR_PRESTACAO)

  const parsed = enviarPrestacaoContasSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const prestacao = await db.tfdPrestacaoConta.findFirst({
      where: {
        id: data.prestacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        agendamento_id: true,
        agendamento: {
          select: {
            id: true,
            sequencia: true,
            solicitacao: {
              select: {
                id: true,
                status: true,
                urgencia: true,
                processo_id: true,
                processo: { select: { protocolo: true } },
                especialidade: { select: { nome: true } },
              },
            },
          },
        },
      },
    })

    if (!prestacao) {
      return { success: false, error: MSG_PRESTACAO_ID_NAO_ENCONTRADA }
    }

    if (!prestacao.agendamento_id || !prestacao.agendamento) {
      return { success: false, error: MSG_PRESTACAO_SEM_AGENDAMENTO }
    }

    const agendamento = prestacao.agendamento

    const statusPc = prestacao.status
    if (statusPc !== 'PENDENTE' && statusPc !== 'REJEITADA') {
      return { success: false, error: MSG_PRESTACAO_STATUS_INVALIDO }
    }

    if (agendamento.solicitacao.status !== 'AGUARDANDO_PC') {
      return { success: false, error: MSG_SOLICITACAO_STATUS_INVALIDO_ENVIO }
    }

    const itensDespesa = await buscarItensDespesaDoAgendamento(
      db,
      tenantId,
      agendamento.id
    )

    try {
      validarItensDespesaComComprovante(itensDespesa)
    } catch (error) {
      if (error instanceof FinanceiroBusinessError) {
        return { success: false, error: error.message }
      }
      throw error
    }

    const protocolo = agendamento.solicitacao.processo.protocolo
    const especialidadeNome = agendamento.solicitacao.especialidade?.nome ?? 'Não informada'

    const resultado = await db.$transaction(async (tx) => {
      const prestacaoLocked = await tx.tfdPrestacaoConta.findFirst({
        where: {
          id: data.prestacaoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          agendamento_id: true,
          agendamento: {
            select: {
              id: true,
              sequencia: true,
              solicitacao: {
                select: {
                  id: true,
                  status: true,
                  processo_id: true,
                },
              },
            },
          },
        },
      })

      if (!prestacaoLocked) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ID_NAO_ENCONTRADA)
      }

      if (!prestacaoLocked.agendamento_id || !prestacaoLocked.agendamento) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_SEM_AGENDAMENTO)
      }

      const agendamentoLocked = prestacaoLocked.agendamento

      const statusLocked = prestacaoLocked.status
      if (statusLocked !== 'PENDENTE' && statusLocked !== 'REJEITADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_STATUS_INVALIDO)
      }

      if (agendamentoLocked.solicitacao.status !== 'AGUARDANDO_PC') {
        throw new FinanceiroBusinessError(MSG_SOLICITACAO_STATUS_INVALIDO_ENVIO)
      }

      const itensLocked = await buscarItensDespesaDoAgendamento(
        tx,
        tenantId,
        agendamentoLocked.id
      )

      validarItensDespesaComComprovante(itensLocked)

      const valorTotal = itensLocked.reduce((acc, item) => acc + Number(item.valor), 0)

      await tx.tfdPrestacaoConta.update({
        where: { id: prestacaoLocked.id },
        data: {
          status: 'ENVIADA',
          comprovantes_vistos: [],
          observacoes_gestor: null,
        },
      })

      await tx.tfdSolicitacao.update({
        where: { id: agendamentoLocked.solicitacao.id },
        data: { status: 'PC_EM_ANALISE' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: agendamentoLocked.solicitacao.processo_id,
          tipo: 'PRESTACAO_ENVIADA',
          descricao: `Prestação de contas do agendamento ${agendamentoLocked.sequencia} enviada para análise (total ${formatValorBrl(valorTotal)}).`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: prestacaoLocked.id,
            agendamentoId: agendamentoLocked.id,
            valorTotal,
            quantidadeItens: itensLocked.length,
          },
        },
        tx
      )

      return {
        prestacaoId: prestacaoLocked.id,
        agendamentoId: agendamentoLocked.id,
        solicitacaoId: agendamentoLocked.solicitacao.id,
        processoId: agendamentoLocked.solicitacao.processo_id,
        sequenciaAgendamento: agendamentoLocked.sequencia,
        valorTotal,
        quantidadeItens: itensLocked.length,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadDepois: {
        statusPrestacao: 'ENVIADA',
        statusSolicitacao: 'PC_EM_ANALISE',
        valorTotal: resultado.valorTotal,
        quantidadeItens: resultado.quantidadeItens,
        agendamentoId: resultado.agendamentoId,
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.PRESTACAO_ENVIADA,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo,
        especialidade: especialidadeNome,
        sequenciaViagem: resultado.sequenciaAgendamento,
        valorTotalFormatado: formatValorBrl(resultado.valorTotal),
      },
      excludeUserIds: [session.user.id],
    })

    revalidateAgendamentoFinanceiroPaths(
      resultado.processoId,
      resultado.agendamentoId,
      resultado.solicitacaoId
    )

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[enviarPrestacaoContasAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível enviar a prestação de contas. Tente novamente.',
    }
  }
}

/** Visualização de comprovante — prestação vinculada a agendamento (sem viagem legada). */
export async function registrarVisualizacaoComprovanteAgendamento(
  rawInput: unknown
): Promise<ActionResponse<{ url: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')

  await requirePermission(session, TFD_PERMISSIONS.APROVAR_PRESTACAO)

  const parsed = registrarVisualizacaoComprovanteSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const userId = session.user.id
    const db = await getPrismaForTenant(tenantId)

    const prestacao = await db.tfdPrestacaoConta.findFirst({
      where: {
        id: data.prestacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        viagem_id: true,
        agendamento_id: true,
        comprovantes_vistos: true,
        agendamento: {
          select: {
            id: true,
            sequencia: true,
            solicitacao: {
              select: {
                id: true,
                status: true,
                processo_id: true,
                processo: { select: { protocolo: true } },
              },
            },
          },
        },
      },
    })

    if (!prestacao) {
      return { success: false, error: MSG_PRESTACAO_ID_NAO_ENCONTRADA }
    }

    if (!prestacao.agendamento_id || !prestacao.agendamento) {
      return { success: false, error: MSG_PRESTACAO_SEM_AGENDAMENTO }
    }

    if (prestacao.viagem_id) {
      return { success: false, error: MSG_PRESTACAO_FLUXO_VIAGEM }
    }

    const agendamento = prestacao.agendamento

    if (
      prestacao.status !== 'ENVIADA' ||
      agendamento.solicitacao.status !== 'PC_EM_ANALISE'
    ) {
      return { success: false, error: MSG_PRESTACAO_ANALISE_APENAS }
    }

    const visualizadoAt = new Date().toISOString()

    const resultado = await db.$transaction(async (tx) => {
      const prestacaoLocked = await tx.tfdPrestacaoConta.findFirst({
        where: {
          id: data.prestacaoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          viagem_id: true,
          agendamento_id: true,
          comprovantes_vistos: true,
          agendamento: {
            select: {
              id: true,
              solicitacao: {
                select: {
                  id: true,
                  status: true,
                  processo_id: true,
                },
              },
            },
          },
        },
      })

      if (!prestacaoLocked) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ID_NAO_ENCONTRADA)
      }

      if (!prestacaoLocked.agendamento_id || !prestacaoLocked.agendamento) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_SEM_AGENDAMENTO)
      }

      if (prestacaoLocked.viagem_id) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_FLUXO_VIAGEM)
      }

      const agendamentoLocked = prestacaoLocked.agendamento

      if (prestacaoLocked.status !== 'ENVIADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ANALISE_APENAS)
      }

      if (agendamentoLocked.solicitacao.status !== 'PC_EM_ANALISE') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ANALISE_APENAS)
      }

      const itensDespesa = await buscarItensDespesaDoAgendamento(
        tx,
        tenantId,
        agendamentoLocked.id
      )

      const itemPertence = itensDespesa.some(
        (item) => item.comprovante_anexo_id === data.comprovanteAnexoId
      )

      if (!itemPertence) {
        throw new FinanceiroBusinessError(MSG_COMPROVANTE_NAO_PERTENCE_PRESTACAO)
      }

      const comprovantesAtualizados = upsertComprovanteVisto(
        parseComprovantesVistos(prestacaoLocked.comprovantes_vistos),
        data.comprovanteAnexoId,
        userId,
        visualizadoAt
      )

      await tx.tfdPrestacaoConta.update({
        where: { id: prestacaoLocked.id },
        data: {
          comprovantes_vistos: JSON.parse(
            JSON.stringify(comprovantesAtualizados)
          ) as Prisma.InputJsonValue,
        },
      })

      return {
        prestacaoId: prestacaoLocked.id,
        agendamentoId: agendamentoLocked.id,
        solicitacaoId: agendamentoLocked.solicitacao.id,
        processoId: agendamentoLocked.solicitacao.processo_id,
        quantidadeVistos: comprovantesAtualizados.length,
      }
    })

    const { url } = await gerarUrlDownloadAnexo(
      {
        tenantId,
        anexoId: data.comprovanteAnexoId,
        downloadExpiresInMinutes: COMPROVANTE_DOWNLOAD_EXPIRES_MINUTES,
      },
      db
    )

    await createAuditLog({
      tenantId,
      userId,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadDepois: {
        prestacaoId: resultado.prestacaoId,
        agendamentoId: resultado.agendamentoId,
        comprovanteAnexoId: data.comprovanteAnexoId,
        visualizadoAt,
        quantidadeComprovantesVistos: resultado.quantidadeVistos,
        protocolo: agendamento.solicitacao.processo.protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidateAgendamentoFinanceiroPaths(
      resultado.processoId,
      resultado.agendamentoId,
      resultado.solicitacaoId
    )

    return {
      success: true,
      data: { url },
    }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    if (error instanceof StorageNotFoundError) {
      return { success: false, error: MSG_COMPROVANTE_NAO_ENCONTRADO }
    }

    if (error instanceof StorageValidationError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarVisualizacaoComprovanteAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a visualização do comprovante. Tente novamente.',
    }
  }
}

/** Aprovação ou rejeição — prestação vinculada a agendamento (sem viagem legada). */
export async function decidirPrestacaoContasAgendamento(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')

  await requirePermission(session, TFD_PERMISSIONS.APROVAR_PRESTACAO)

  const parsed = decidirPrestacaoContasAgendamentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const prestacao = await db.tfdPrestacaoConta.findFirst({
      where: {
        id: data.prestacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        viagem_id: true,
        agendamento_id: true,
        comprovantes_vistos: true,
        agendamento: {
          select: {
            id: true,
            sequencia: true,
            solicitacao: {
              select: {
                id: true,
                status: true,
                solicitante_id: true,
                processo_id: true,
                processo: {
                  select: {
                    protocolo: true,
                    aberto_por_id: true,
                  },
                },
                especialidade: { select: { nome: true } },
              },
            },
          },
        },
      },
    })

    if (!prestacao) {
      return { success: false, error: MSG_PRESTACAO_ID_NAO_ENCONTRADA }
    }

    if (!prestacao.agendamento_id || !prestacao.agendamento) {
      return { success: false, error: MSG_PRESTACAO_SEM_AGENDAMENTO }
    }

    if (prestacao.viagem_id) {
      return { success: false, error: MSG_PRESTACAO_FLUXO_VIAGEM }
    }

    const agendamento = prestacao.agendamento

    if (prestacao.status !== 'ENVIADA') {
      return { success: false, error: MSG_PRESTACAO_ENVIADA_APENAS }
    }

    if (agendamento.solicitacao.status !== 'PC_EM_ANALISE') {
      return { success: false, error: MSG_TRANSICAO_INVALIDA }
    }

    const protocolo = agendamento.solicitacao.processo.protocolo
    const especialidadeNome =
      agendamento.solicitacao.especialidade?.nome ?? 'Não informada'
    const servidorResponsavelId =
      agendamento.solicitacao.processo.aberto_por_id ??
      agendamento.solicitacao.solicitante_id
    const decididoAt = new Date()

    const itensDespesaInicial = await buscarItensDespesaDoAgendamento(
      db,
      tenantId,
      agendamento.id
    )

    if (data.decisao === 'REJEITADA') {
      const observacoesGestor = data.observacoesGestor!.trim()

      const resultado = await db.$transaction(async (tx) => {
        const prestacaoLocked = await tx.tfdPrestacaoConta.findFirst({
          where: {
            id: data.prestacaoId,
            tenant_id: tenantId,
          },
          select: {
            id: true,
            status: true,
            viagem_id: true,
            agendamento: {
              select: {
                id: true,
                sequencia: true,
                solicitacao: {
                  select: {
                    id: true,
                    status: true,
                    processo_id: true,
                  },
                },
              },
            },
          },
        })

        if (!prestacaoLocked) {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_ID_NAO_ENCONTRADA)
        }

        if (!prestacaoLocked.agendamento) {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_SEM_AGENDAMENTO)
        }

        if (prestacaoLocked.viagem_id) {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_FLUXO_VIAGEM)
        }

        if (prestacaoLocked.status !== 'ENVIADA') {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_ENVIADA_APENAS)
        }

        const agendamentoLocked = prestacaoLocked.agendamento

        if (agendamentoLocked.solicitacao.status !== 'PC_EM_ANALISE') {
          throw new FinanceiroBusinessError(MSG_TRANSICAO_INVALIDA)
        }

        await tx.tfdPrestacaoConta.update({
          where: { id: prestacaoLocked.id },
          data: {
            status: 'REJEITADA',
            observacoes_gestor: observacoesGestor,
            aprovado_por_id: session.user.id,
            aprovado_at: decididoAt,
          },
        })

        await tx.tfdSolicitacao.update({
          where: { id: agendamentoLocked.solicitacao.id },
          data: { status: 'AGUARDANDO_PC' },
        })

        await registrarTramitacao(
          {
            tenantId,
            processoId: agendamentoLocked.solicitacao.processo_id,
            tipo: 'PRESTACAO_REJEITADA',
            descricao: `Prestação de contas do agendamento ${agendamentoLocked.sequencia} rejeitada. ${observacoesGestor}`,
            usuarioId: session.user.id,
            metadata: {
              prestacaoId: prestacaoLocked.id,
              agendamentoId: agendamentoLocked.id,
            },
          },
          tx
        )

        return {
          prestacaoId: prestacaoLocked.id,
          agendamentoId: agendamentoLocked.id,
          solicitacaoId: agendamentoLocked.solicitacao.id,
          processoId: agendamentoLocked.solicitacao.processo_id,
          sequenciaAgendamento: agendamentoLocked.sequencia,
        }
      })

      await createAuditLog({
        tenantId,
        userId: session.user.id,
        acao: 'UPDATE',
        entidade: 'saude_tfd_prestacao_conta',
        entidadeId: resultado.prestacaoId,
        payloadAntes: { statusPrestacao: 'ENVIADA', statusSolicitacao: 'PC_EM_ANALISE' },
        payloadDepois: {
          statusPrestacao: 'REJEITADA',
          statusSolicitacao: 'AGUARDANDO_PC',
          decisao: 'REJEITADA',
          protocolo,
          modulo: MODULO_TFD,
          processoId: resultado.processoId,
          agendamentoId: resultado.agendamentoId,
        },
      })

      if (servidorResponsavelId) {
        await dispararNotificacao({
          tenantId,
          evento: NOTIFICATION_EVENTS.PRESTACAO_REJEITADA,
          modulo: MODULO_TFD,
          processoId: resultado.processoId,
          context: {
            protocolo,
            especialidade: especialidadeNome,
            sequenciaViagem: resultado.sequenciaAgendamento,
            observacoesGestor,
          },
          recipientUserIds: [servidorResponsavelId],
          excludeUserIds: [session.user.id],
        })
      }

      revalidateAgendamentoFinanceiroPaths(
        resultado.processoId,
        resultado.agendamentoId,
        resultado.solicitacaoId
      )

      return { success: true, data: undefined }
    }

    const comprovantesVistos = parseComprovantesVistos(prestacao.comprovantes_vistos)

    try {
      assertTodosComprovantesVisualizados(itensDespesaInicial, comprovantesVistos)
    } catch (error) {
      if (error instanceof FinanceiroBusinessError) {
        return { success: false, error: error.message }
      }
      throw error
    }

    const reservaAtiva = await db.tfdReservaSaldo.findFirst({
      where: {
        tenant_id: tenantId,
        solicitacao_id: agendamento.solicitacao.id,
        status: 'ATIVA',
      },
      select: { saldo_id: true },
    })

    const saldoIdAfetado = reservaAtiva?.saldo_id ?? null
    let jaEstavaEmAlertaBaixo = false

    if (saldoIdAfetado) {
      const estadoSaldoAntes = await resolveSaldoEstadoAlerta(db, tenantId, saldoIdAfetado)
      jaEstavaEmAlertaBaixo = estadoSaldoAntes?.alertaBaixo ?? false
    }

    const resultado = await db.$transaction(async (tx) => {
      const prestacaoLocked = await tx.tfdPrestacaoConta.findFirst({
        where: {
          id: data.prestacaoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          viagem_id: true,
          comprovantes_vistos: true,
          agendamento: {
            select: {
              id: true,
              sequencia: true,
              solicitacao: {
                select: {
                  id: true,
                  status: true,
                  processo_id: true,
                },
              },
            },
          },
        },
      })

      if (!prestacaoLocked) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ID_NAO_ENCONTRADA)
      }

      if (!prestacaoLocked.agendamento) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_SEM_AGENDAMENTO)
      }

      if (prestacaoLocked.viagem_id) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_FLUXO_VIAGEM)
      }

      if (prestacaoLocked.status !== 'ENVIADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ENVIADA_APENAS)
      }

      const agendamentoLocked = prestacaoLocked.agendamento

      if (agendamentoLocked.solicitacao.status !== 'PC_EM_ANALISE') {
        throw new FinanceiroBusinessError(MSG_TRANSICAO_INVALIDA)
      }

      const itensLocked = await buscarItensDespesaDoAgendamento(
        tx,
        tenantId,
        agendamentoLocked.id
      )

      assertTodosComprovantesVisualizados(
        itensLocked,
        parseComprovantesVistos(prestacaoLocked.comprovantes_vistos)
      )

      validarItensDespesaComComprovante(itensLocked)

      const valorReal = roundMoney(
        itensLocked.reduce((acc, item) => acc + Number(item.valor), 0)
      )

      const reservaLocked = await lockReservaForUpdate(
        tx,
        tenantId,
        agendamentoLocked.solicitacao.id
      )

      if (!reservaLocked) {
        throw new FinanceiroBusinessError(MSG_RESERVA_NAO_ENCONTRADA)
      }

      const saldoLocked = await lockSaldoForUpdate(tx, tenantId, reservaLocked.saldo_id)

      if (!saldoLocked) {
        throw new FinanceiroBusinessError(MSG_RESERVA_NAO_ENCONTRADA)
      }

      const valorReservado = roundMoney(Number(reservaLocked.valor_estimado))
      const valorLiberacao = roundMoney(Math.max(0, valorReservado - valorReal))

      await tx.tfdReservaSaldo.update({
        where: { id: reservaLocked.id },
        data: {
          status: 'CONSUMIDA',
          consumido_at: decididoAt,
        },
      })

      await tx.tfdMovimentacaoSaldo.create({
        data: {
          tenant_id: tenantId,
          saldo_id: reservaLocked.saldo_id,
          tipo: 'CONSUMO',
          valor: valorReal,
          solicitacao_id: agendamentoLocked.solicitacao.id,
          descricao: 'Consumo — prestação de contas aprovada',
          usuario_id: session.user.id,
        },
      })

      if (valorLiberacao > 0) {
        await tx.tfdMovimentacaoSaldo.create({
          data: {
            tenant_id: tenantId,
            saldo_id: reservaLocked.saldo_id,
            tipo: 'LIBERACAO',
            valor: valorLiberacao,
            solicitacao_id: agendamentoLocked.solicitacao.id,
            descricao: 'Liberação — diferença entre valor estimado e real da prestação',
            usuario_id: session.user.id,
          },
        })
      }

      await tx.tfdPrestacaoConta.update({
        where: { id: prestacaoLocked.id },
        data: {
          status: 'APROVADA',
          aprovado_por_id: session.user.id,
          aprovado_at: decididoAt,
          observacoes_gestor: data.observacoesGestor?.trim() || null,
        },
      })

      await tx.tfdSolicitacao.update({
        where: { id: agendamentoLocked.solicitacao.id },
        data: { status: 'CONCLUIDO' },
      })

      await tx.processo.update({
        where: { id: agendamentoLocked.solicitacao.processo_id },
        data: { status: 'CONCLUIDO' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: agendamentoLocked.solicitacao.processo_id,
          tipo: 'PRESTACAO_APROVADA',
          descricao: `Prestação de contas do agendamento ${agendamentoLocked.sequencia} aprovada (total ${formatValorBrl(valorReal)}).`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: prestacaoLocked.id,
            agendamentoId: agendamentoLocked.id,
            valorReal,
            valorReservado,
            valorLiberacao,
          },
        },
        tx
      )

      await registrarTramitacao(
        {
          tenantId,
          processoId: agendamentoLocked.solicitacao.processo_id,
          tipo: 'CONCLUSAO',
          descricao: `Processo TFD concluído após aprovação da prestação do agendamento ${agendamentoLocked.sequencia}.`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: prestacaoLocked.id,
            agendamentoId: agendamentoLocked.id,
          },
        },
        tx
      )

      return {
        prestacaoId: prestacaoLocked.id,
        agendamentoId: agendamentoLocked.id,
        solicitacaoId: agendamentoLocked.solicitacao.id,
        processoId: agendamentoLocked.solicitacao.processo_id,
        sequenciaAgendamento: agendamentoLocked.sequencia,
        valorReal,
        valorReservado,
        valorLiberacao,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadAntes: { statusPrestacao: 'ENVIADA', statusSolicitacao: 'PC_EM_ANALISE' },
      payloadDepois: {
        statusPrestacao: 'APROVADA',
        statusSolicitacao: 'CONCLUIDO',
        processoStatus: 'CONCLUIDO',
        decisao: 'APROVADA',
        valorReal: resultado.valorReal,
        valorReservado: resultado.valorReservado,
        valorLiberacao: resultado.valorLiberacao,
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
        agendamentoId: resultado.agendamentoId,
      },
    })

    if (servidorResponsavelId) {
      await dispararNotificacao({
        tenantId,
        evento: NOTIFICATION_EVENTS.PRESTACAO_APROVADA,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
        context: {
          protocolo,
          especialidade: especialidadeNome,
          sequenciaViagem: resultado.sequenciaAgendamento,
          valorTotalFormatado: formatValorBrl(resultado.valorReal),
        },
        recipientUserIds: [servidorResponsavelId],
        excludeUserIds: [session.user.id],
      })
    }

    if (saldoIdAfetado) {
      await tryNotificarSaldoBaixoAposMutacao({
        tenantId,
        saldoId: saldoIdAfetado,
        jaEstavaEmAlertaBaixo,
        excludeUserIds: [session.user.id],
      })
    }

    revalidateAgendamentoFinanceiroPaths(
      resultado.processoId,
      resultado.agendamentoId,
      resultado.solicitacaoId
    )

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[decidirPrestacaoContasAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a decisão da prestação. Tente novamente.',
    }
  }
}

/** Despesa vinculada à prestação da viagem nova (saude_tfd.viagens). */
export async function registrarDespesaViagemNova(
  rawInput: unknown
): Promise<ActionResponse<{ despesaId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.REGISTRAR_DESPESA)

  const parsed = registrarDespesaViagemNovaSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  if (exigeComprovante(data.valor) && !data.comprovanteAnexoId) {
    return {
      success: false,
      error: MSG_COMPROVANTE_OBRIGATORIO,
      fieldErrors: {
        comprovanteAnexoId: [MSG_COMPROVANTE_OBRIGATORIO],
      },
    }
  }

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const viagem = await db.tfdViagem.findFirst({
      where: {
        id: data.viagemNovaId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        protocolo: true,
        processo_id: true,
        prestacao_conta: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!viagem) {
      return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
    }

    if (viagem.status !== 'CONCLUIDA') {
      return { success: false, error: MSG_VIAGEM_NOVA_NAO_CONCLUIDA }
    }

    if (!viagem.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA }
    }

    const statusPrestacao = viagem.prestacao_conta.status
    if (statusPrestacao !== 'PENDENTE' && statusPrestacao !== 'REJEITADA') {
      return { success: false, error: MSG_PRESTACAO_STATUS_INVALIDO }
    }

    const resultado = await db.$transaction(async (tx) => {
      const viagemLocked = await tx.tfdViagem.findFirst({
        where: {
          id: data.viagemNovaId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          protocolo: true,
          processo_id: true,
          prestacao_conta: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      })

      if (!viagemLocked) {
        throw new FinanceiroBusinessError(MSG_VIAGEM_NAO_ENCONTRADA)
      }

      if (viagemLocked.status !== 'CONCLUIDA') {
        throw new FinanceiroBusinessError(MSG_VIAGEM_NOVA_NAO_CONCLUIDA)
      }

      if (!viagemLocked.prestacao_conta) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA)
      }

      const statusPc = viagemLocked.prestacao_conta.status
      if (statusPc !== 'PENDENTE' && statusPc !== 'REJEITADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_STATUS_INVALIDO)
      }

      if (exigeComprovante(data.valor) && !data.comprovanteAnexoId) {
        throw new FinanceiroBusinessError(MSG_COMPROVANTE_OBRIGATORIO)
      }

      if (data.comprovanteAnexoId) {
        await validarComprovanteAnexo(tx, tenantId, data.comprovanteAnexoId)
      }

      let transporteIdLocked: string | null = null

      if (data.segmentoId) {
        const segmento = await tx.tfdTransporte.findFirst({
          where: {
            id: data.segmentoId,
            tenant_id: tenantId,
            viagem_id: data.viagemNovaId,
          },
          select: { id: true },
        })

        if (!segmento) {
          throw new FinanceiroBusinessError(MSG_SEGMENTO_NAO_ENCONTRADO)
        }

        transporteIdLocked = segmento.id
      }

      const item = await tx.tfdItemDespesa.create({
        data: {
          tenant_id: tenantId,
          viagem_nova_id: viagemLocked.id,
          viagem_id: null,
          agendamento_id: null,
          transporte_id: transporteIdLocked,
          tipo: data.tipo,
          descricao: data.descricao?.trim() || null,
          valor: data.valor,
          comprovante_anexo_id: data.comprovanteAnexoId ?? null,
          responsavel_pagamento: data.responsavelPagamento,
        },
        select: { id: true },
      })

      return {
        despesaId: item.id,
        viagemNovaId: viagemLocked.id,
        prestacaoId: viagemLocked.prestacao_conta.id,
        processoId: viagemLocked.processo_id,
        protocolo: viagemLocked.protocolo,
        transporteId: transporteIdLocked,
        tipo: data.tipo,
        valor: data.valor,
        possuiComprovante: Boolean(data.comprovanteAnexoId),
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_item_despesa',
      entidadeId: resultado.despesaId,
      payloadDepois: {
        viagemNovaId: resultado.viagemNovaId,
        prestacaoId: resultado.prestacaoId,
        transporteId: resultado.transporteId,
        segmentoId: data.segmentoId ?? null,
        tipo: resultado.tipo,
        valor: resultado.valor,
        possuiComprovante: resultado.possuiComprovante,
        protocolo: resultado.protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidateViagemNovaFinanceiroPaths(resultado.processoId, resultado.viagemNovaId)

    return {
      success: true,
      data: { despesaId: resultado.despesaId },
    }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarDespesaViagemNova] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a despesa. Tente novamente.',
    }
  }
}

/** Envio da prestação de contas vinculada à viagem nova. */
export async function enviarPrestacaoContasViagemNova(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ENVIAR_PRESTACAO)

  const parsed = enviarPrestacaoContasViagemNovaSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const viagem = await db.tfdViagem.findFirst({
      where: {
        id: data.viagemNovaId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        protocolo: true,
        status: true,
        processo_id: true,
        processo: { select: { protocolo: true } },
        prestacao_conta: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!viagem) {
      return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
    }

    if (viagem.status !== 'CONCLUIDA') {
      return { success: false, error: MSG_VIAGEM_NOVA_NAO_CONCLUIDA }
    }

    if (!viagem.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA }
    }

    const statusPc = viagem.prestacao_conta.status
    if (statusPc !== 'PENDENTE' && statusPc !== 'REJEITADA') {
      return { success: false, error: MSG_PRESTACAO_STATUS_INVALIDO }
    }

    const itensDespesa = await buscarItensDespesaDaViagemNova(db, tenantId, viagem.id)

    try {
      validarItensDespesaComComprovante(itensDespesa)
    } catch (error) {
      if (error instanceof FinanceiroBusinessError) {
        return { success: false, error: error.message }
      }
      throw error
    }

    const protocolo = viagem.processo.protocolo

    const resultado = await db.$transaction(async (tx) => {
      const viagemLocked = await tx.tfdViagem.findFirst({
        where: {
          id: data.viagemNovaId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          protocolo: true,
          status: true,
          processo_id: true,
          prestacao_conta: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      })

      if (!viagemLocked) {
        throw new FinanceiroBusinessError(MSG_VIAGEM_NAO_ENCONTRADA)
      }

      if (viagemLocked.status !== 'CONCLUIDA') {
        throw new FinanceiroBusinessError(MSG_VIAGEM_NOVA_NAO_CONCLUIDA)
      }

      if (!viagemLocked.prestacao_conta) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA)
      }

      const statusLocked = viagemLocked.prestacao_conta.status
      if (statusLocked !== 'PENDENTE' && statusLocked !== 'REJEITADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_STATUS_INVALIDO)
      }

      const itensLocked = await buscarItensDespesaDaViagemNova(tx, tenantId, viagemLocked.id)
      validarItensDespesaComComprovante(itensLocked)

      const valorTotal = itensLocked.reduce((acc, item) => acc + Number(item.valor), 0)

      await tx.tfdPrestacaoConta.update({
        where: { id: viagemLocked.prestacao_conta.id },
        data: {
          status: 'ENVIADA',
          comprovantes_vistos: [],
          observacoes_gestor: null,
        },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagemLocked.processo_id,
          tipo: 'PRESTACAO_ENVIADA',
          descricao: `Prestação de contas da viagem ${viagemLocked.protocolo} enviada para análise (total ${formatValorBrl(valorTotal)}).`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: viagemLocked.prestacao_conta.id,
            viagemNovaId: viagemLocked.id,
            valorTotal,
            quantidadeItens: itensLocked.length,
          },
        },
        tx
      )

      return {
        prestacaoId: viagemLocked.prestacao_conta.id,
        viagemNovaId: viagemLocked.id,
        processoId: viagemLocked.processo_id,
        protocolo: viagemLocked.protocolo,
        sequenciaViagem: extrairSequenciaProtocoloViagemNova(viagemLocked.protocolo),
        valorTotal,
        quantidadeItens: itensLocked.length,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadDepois: {
        statusPrestacao: 'ENVIADA',
        valorTotal: resultado.valorTotal,
        quantidadeItens: resultado.quantidadeItens,
        viagemNovaId: resultado.viagemNovaId,
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.PRESTACAO_ENVIADA,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo,
        especialidade: 'TFD',
        sequenciaViagem: resultado.sequenciaViagem,
        valorTotalFormatado: formatValorBrl(resultado.valorTotal),
      },
      excludeUserIds: [session.user.id],
    })

    revalidateViagemNovaFinanceiroPaths(resultado.processoId, resultado.viagemNovaId)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[enviarPrestacaoContasViagemNova] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível enviar a prestação de contas. Tente novamente.',
    }
  }
}

/** Visualização de comprovante — prestação vinculada à viagem nova. */
export async function registrarVisualizacaoComprovanteViagemNova(
  rawInput: unknown
): Promise<ActionResponse<{ url: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.APROVAR_PRESTACAO)

  const parsed = registrarVisualizacaoComprovanteViagemNovaSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const userId = session.user.id
    const db = await getPrismaForTenant(tenantId)

    const viagem = await db.tfdViagem.findFirst({
      where: {
        id: data.viagemNovaId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        protocolo: true,
        status: true,
        processo_id: true,
        processo: { select: { protocolo: true } },
        prestacao_conta: {
          select: {
            id: true,
            status: true,
            comprovantes_vistos: true,
          },
        },
      },
    })

    if (!viagem) {
      return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
    }

    if (!viagem.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA }
    }

    if (viagem.status !== 'CONCLUIDA' || viagem.prestacao_conta.status !== 'ENVIADA') {
      return { success: false, error: MSG_PRESTACAO_ANALISE_APENAS }
    }

    const visualizadoAt = new Date().toISOString()

    const resultado = await db.$transaction(async (tx) => {
      const viagemLocked = await tx.tfdViagem.findFirst({
        where: {
          id: data.viagemNovaId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          processo_id: true,
          prestacao_conta: {
            select: {
              id: true,
              status: true,
              comprovantes_vistos: true,
            },
          },
        },
      })

      if (!viagemLocked?.prestacao_conta) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA)
      }

      if (viagemLocked.prestacao_conta.status !== 'ENVIADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ANALISE_APENAS)
      }

      const itensDespesa = await buscarItensDespesaDaViagemNova(tx, tenantId, viagemLocked.id)

      const itemPertence = itensDespesa.some(
        (item) => item.comprovante_anexo_id === data.comprovanteAnexoId
      )

      if (!itemPertence) {
        throw new FinanceiroBusinessError(MSG_COMPROVANTE_NAO_PERTENCE_PRESTACAO)
      }

      const comprovantesAtualizados = upsertComprovanteVisto(
        parseComprovantesVistos(viagemLocked.prestacao_conta.comprovantes_vistos),
        data.comprovanteAnexoId,
        userId,
        visualizadoAt
      )

      await tx.tfdPrestacaoConta.update({
        where: { id: viagemLocked.prestacao_conta.id },
        data: {
          comprovantes_vistos: JSON.parse(
            JSON.stringify(comprovantesAtualizados)
          ) as Prisma.InputJsonValue,
        },
      })

      return {
        prestacaoId: viagemLocked.prestacao_conta.id,
        viagemNovaId: viagemLocked.id,
        processoId: viagemLocked.processo_id,
        quantidadeVistos: comprovantesAtualizados.length,
      }
    })

    const { url } = await gerarUrlDownloadAnexo(
      {
        tenantId,
        anexoId: data.comprovanteAnexoId,
        downloadExpiresInMinutes: COMPROVANTE_DOWNLOAD_EXPIRES_MINUTES,
      },
      db
    )

    await createAuditLog({
      tenantId,
      userId,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadDepois: {
        prestacaoId: resultado.prestacaoId,
        viagemNovaId: resultado.viagemNovaId,
        comprovanteAnexoId: data.comprovanteAnexoId,
        visualizadoAt,
        quantidadeComprovantesVistos: resultado.quantidadeVistos,
        protocolo: viagem.processo.protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidateViagemNovaFinanceiroPaths(resultado.processoId, resultado.viagemNovaId)

    return {
      success: true,
      data: { url },
    }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    if (error instanceof StorageNotFoundError) {
      return { success: false, error: MSG_COMPROVANTE_NAO_ENCONTRADO }
    }

    if (error instanceof StorageValidationError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarVisualizacaoComprovanteViagemNova] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a visualização do comprovante. Tente novamente.',
    }
  }
}

/** Aprovação ou rejeição — prestação vinculada à viagem nova. */
export async function decidirPrestacaoContasViagemNova(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.APROVAR_PRESTACAO)

  const parsed = decidirPrestacaoContasViagemNovaSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const viagem = await db.tfdViagem.findFirst({
      where: {
        id: data.viagemNovaId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        protocolo: true,
        status: true,
        processo_id: true,
        processo: {
          select: {
            protocolo: true,
            aberto_por_id: true,
          },
        },
        prestacao_conta: {
          select: {
            id: true,
            status: true,
            comprovantes_vistos: true,
          },
        },
      },
    })

    if (!viagem) {
      return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
    }

    if (!viagem.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA }
    }

    if (viagem.prestacao_conta.status !== 'ENVIADA') {
      return { success: false, error: MSG_PRESTACAO_ENVIADA_APENAS }
    }

    const protocolo = viagem.processo.protocolo
    const servidorResponsavelId = viagem.processo.aberto_por_id
    const decididoAt = new Date()

    const itensDespesaInicial = await buscarItensDespesaDaViagemNova(db, tenantId, viagem.id)

    if (data.decisao === 'REJEITADA') {
      const observacoesGestor = data.observacoesGestor!.trim()

      const resultado = await db.$transaction(async (tx) => {
        const viagemLocked = await tx.tfdViagem.findFirst({
          where: {
            id: data.viagemNovaId,
            tenant_id: tenantId,
          },
          select: {
            id: true,
            protocolo: true,
            processo_id: true,
            prestacao_conta: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        })

        if (!viagemLocked?.prestacao_conta) {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA)
        }

        if (viagemLocked.prestacao_conta.status !== 'ENVIADA') {
          throw new FinanceiroBusinessError(MSG_PRESTACAO_ENVIADA_APENAS)
        }

        await tx.tfdPrestacaoConta.update({
          where: { id: viagemLocked.prestacao_conta.id },
          data: {
            status: 'REJEITADA',
            observacoes_gestor: observacoesGestor,
            aprovado_por_id: session.user.id,
            aprovado_at: decididoAt,
          },
        })

        await registrarTramitacao(
          {
            tenantId,
            processoId: viagemLocked.processo_id,
            tipo: 'PRESTACAO_REJEITADA',
            descricao: `Prestação de contas da viagem ${viagemLocked.protocolo} rejeitada. ${observacoesGestor}`,
            usuarioId: session.user.id,
            metadata: {
              prestacaoId: viagemLocked.prestacao_conta.id,
              viagemNovaId: viagemLocked.id,
            },
          },
          tx
        )

        return {
          prestacaoId: viagemLocked.prestacao_conta.id,
          viagemNovaId: viagemLocked.id,
          processoId: viagemLocked.processo_id,
          protocolo: viagemLocked.protocolo,
          sequenciaViagem: extrairSequenciaProtocoloViagemNova(viagemLocked.protocolo),
        }
      })

      await createAuditLog({
        tenantId,
        userId: session.user.id,
        acao: 'UPDATE',
        entidade: 'saude_tfd_prestacao_conta',
        entidadeId: resultado.prestacaoId,
        payloadAntes: { statusPrestacao: 'ENVIADA' },
        payloadDepois: {
          statusPrestacao: 'REJEITADA',
          decisao: 'REJEITADA',
          protocolo,
          modulo: MODULO_TFD,
          processoId: resultado.processoId,
          viagemNovaId: resultado.viagemNovaId,
        },
      })

      if (servidorResponsavelId) {
        await dispararNotificacao({
          tenantId,
          evento: NOTIFICATION_EVENTS.PRESTACAO_REJEITADA,
          modulo: MODULO_TFD,
          processoId: resultado.processoId,
          context: {
            protocolo,
            especialidade: 'TFD',
            sequenciaViagem: resultado.sequenciaViagem,
            observacoesGestor,
          },
          recipientUserIds: [servidorResponsavelId],
          excludeUserIds: [session.user.id],
        })
      }

      revalidateViagemNovaFinanceiroPaths(resultado.processoId, resultado.viagemNovaId)

      return { success: true, data: undefined }
    }

    const comprovantesVistos = parseComprovantesVistos(viagem.prestacao_conta.comprovantes_vistos)

    try {
      assertTodosComprovantesVisualizados(itensDespesaInicial, comprovantesVistos)
    } catch (error) {
      if (error instanceof FinanceiroBusinessError) {
        return { success: false, error: error.message }
      }
      throw error
    }

    const reservaAtiva = await db.tfdReservaSaldo.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'ATIVA',
        solicitacao: { processo_id: viagem.processo_id },
      },
      select: { saldo_id: true, solicitacao_id: true },
    })

    const saldoIdAfetado = reservaAtiva?.saldo_id ?? null
    let jaEstavaEmAlertaBaixo = false

    if (saldoIdAfetado) {
      const estadoSaldoAntes = await resolveSaldoEstadoAlerta(db, tenantId, saldoIdAfetado)
      jaEstavaEmAlertaBaixo = estadoSaldoAntes?.alertaBaixo ?? false
    }

    const resultado = await db.$transaction(async (tx) => {
      const viagemLocked = await tx.tfdViagem.findFirst({
        where: {
          id: data.viagemNovaId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          protocolo: true,
          processo_id: true,
          prestacao_conta: {
            select: {
              id: true,
              status: true,
              comprovantes_vistos: true,
            },
          },
        },
      })

      if (!viagemLocked?.prestacao_conta) {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_VIAGEM_NOVA_NAO_ENCONTRADA)
      }

      if (viagemLocked.prestacao_conta.status !== 'ENVIADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ENVIADA_APENAS)
      }

      const itensLocked = await buscarItensDespesaDaViagemNova(tx, tenantId, viagemLocked.id)

      assertTodosComprovantesVisualizados(
        itensLocked,
        parseComprovantesVistos(viagemLocked.prestacao_conta.comprovantes_vistos)
      )
      validarItensDespesaComComprovante(itensLocked)

      const valorReal = roundMoney(
        itensLocked.reduce((acc, item) => acc + Number(item.valor), 0)
      )

      const reservaLocked = reservaAtiva
        ? await lockReservaForUpdate(tx, tenantId, reservaAtiva.solicitacao_id)
        : null

      let valorReservado = 0
      let valorLiberacao = 0

      if (reservaLocked) {
        const saldoLocked = await lockSaldoForUpdate(tx, tenantId, reservaLocked.saldo_id)

        if (!saldoLocked) {
          throw new FinanceiroBusinessError(MSG_RESERVA_NAO_ENCONTRADA)
        }

        valorReservado = roundMoney(Number(reservaLocked.valor_estimado))
        valorLiberacao = roundMoney(Math.max(0, valorReservado - valorReal))

        await tx.tfdReservaSaldo.update({
          where: { id: reservaLocked.id },
          data: {
            status: 'CONSUMIDA',
            consumido_at: decididoAt,
          },
        })

        await tx.tfdMovimentacaoSaldo.create({
          data: {
            tenant_id: tenantId,
            saldo_id: reservaLocked.saldo_id,
            tipo: 'CONSUMO',
            valor: valorReal,
            solicitacao_id: reservaAtiva!.solicitacao_id,
            descricao: 'Consumo — prestação de contas da viagem aprovada',
            usuario_id: session.user.id,
          },
        })

        if (valorLiberacao > 0) {
          await tx.tfdMovimentacaoSaldo.create({
            data: {
              tenant_id: tenantId,
              saldo_id: reservaLocked.saldo_id,
              tipo: 'LIBERACAO',
              valor: valorLiberacao,
              solicitacao_id: reservaAtiva!.solicitacao_id,
              descricao: 'Liberação — diferença entre valor estimado e real da prestação',
              usuario_id: session.user.id,
            },
          })
        }
      }

      await tx.tfdPrestacaoConta.update({
        where: { id: viagemLocked.prestacao_conta.id },
        data: {
          status: 'APROVADA',
          aprovado_por_id: session.user.id,
          aprovado_at: decididoAt,
          observacoes_gestor: data.observacoesGestor?.trim() || null,
        },
      })

      await tx.processo.update({
        where: { id: viagemLocked.processo_id },
        data: { status: 'CONCLUIDO' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagemLocked.processo_id,
          tipo: 'PRESTACAO_APROVADA',
          descricao: `Prestação de contas da viagem ${viagemLocked.protocolo} aprovada (total ${formatValorBrl(valorReal)}).`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: viagemLocked.prestacao_conta.id,
            viagemNovaId: viagemLocked.id,
            valorReal,
            valorReservado,
            valorLiberacao,
          },
        },
        tx
      )

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagemLocked.processo_id,
          tipo: 'CONCLUSAO',
          descricao: `Processo TFD concluído após aprovação da prestação da viagem ${viagemLocked.protocolo}.`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: viagemLocked.prestacao_conta.id,
            viagemNovaId: viagemLocked.id,
          },
        },
        tx
      )

      return {
        prestacaoId: viagemLocked.prestacao_conta.id,
        viagemNovaId: viagemLocked.id,
        processoId: viagemLocked.processo_id,
        protocolo: viagemLocked.protocolo,
        sequenciaViagem: extrairSequenciaProtocoloViagemNova(viagemLocked.protocolo),
        valorReal,
        valorReservado,
        valorLiberacao,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadAntes: { statusPrestacao: 'ENVIADA' },
      payloadDepois: {
        statusPrestacao: 'APROVADA',
        processoStatus: 'CONCLUIDO',
        decisao: 'APROVADA',
        valorReal: resultado.valorReal,
        valorReservado: resultado.valorReservado,
        valorLiberacao: resultado.valorLiberacao,
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
        viagemNovaId: resultado.viagemNovaId,
      },
    })

    if (servidorResponsavelId) {
      await dispararNotificacao({
        tenantId,
        evento: NOTIFICATION_EVENTS.PRESTACAO_APROVADA,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
        context: {
          protocolo,
          especialidade: 'TFD',
          sequenciaViagem: resultado.sequenciaViagem,
          valorTotalFormatado: formatValorBrl(resultado.valorReal),
        },
        recipientUserIds: [servidorResponsavelId],
        excludeUserIds: [session.user.id],
      })
    }

    if (saldoIdAfetado) {
      await tryNotificarSaldoBaixoAposMutacao({
        tenantId,
        saldoId: saldoIdAfetado,
        jaEstavaEmAlertaBaixo,
        excludeUserIds: [session.user.id],
      })
    }

    revalidateViagemNovaFinanceiroPaths(resultado.processoId, resultado.viagemNovaId)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof FinanceiroBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[decidirPrestacaoContasViagemNova] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a decisão da prestação. Tente novamente.',
    }
  }
}
