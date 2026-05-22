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
  decidirPrestacaoContasSchema,
  enviarPrestacaoContasSchema,
  MIN_VALOR_COMPROVANTE,
  registrarDespesaSchema,
  registrarVisualizacaoComprovanteSchema,
} from '../validators/despesa.schema'

const MODULO_TFD = 'saude.tfd'

const MSG_VIAGEM_NAO_ENCONTRADA = 'Viagem não encontrada.'
const MSG_PRESTACAO_NAO_ENCONTRADA =
  'Prestação de contas não encontrada para esta viagem.'
const MSG_PRESTACAO_STATUS_INVALIDO =
  'Só é possível lançar despesas enquanto a prestação está pendente ou foi rejeitada para correção.'
const MSG_VIAGEM_NAO_REALIZADA =
  'Registre o retorno da viagem antes de lançar despesas.'
const MSG_COMPROVANTE_OBRIGATORIO = `Comprovante obrigatório para valores iguais ou superiores a R$ ${MIN_VALOR_COMPROVANTE},00.`
const MSG_COMPROVANTE_NAO_ENCONTRADO =
  'Comprovante não encontrado ou ainda não confirmado no envio.'
const MSG_COMPROVANTE_TIPO_INVALIDO =
  'Comprovante deve ser PDF, JPEG ou PNG (máx. 10 MB).'
const MSG_PRESTACAO_ID_NAO_ENCONTRADA = 'Prestação de contas não encontrada.'
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

    const viagem = await db.tfdViagem.findFirst({
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
      const viagemLocked = await tx.tfdViagem.findFirst({
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

    const statusPc = prestacao.status
    if (statusPc !== 'PENDENTE' && statusPc !== 'REJEITADA') {
      return { success: false, error: MSG_PRESTACAO_STATUS_INVALIDO }
    }

    if (prestacao.viagem.solicitacao.status !== 'AGUARDANDO_PC') {
      return { success: false, error: MSG_SOLICITACAO_STATUS_INVALIDO_ENVIO }
    }

    try {
      validarItensDespesaComComprovante(prestacao.viagem.itens_despesa)
    } catch (error) {
      if (error instanceof FinanceiroBusinessError) {
        return { success: false, error: error.message }
      }
      throw error
    }

    const protocolo = prestacao.viagem.solicitacao.processo.protocolo
    const especialidadeNome = prestacao.viagem.solicitacao.especialidade?.nome ?? 'Não informada'

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

      const statusLocked = prestacaoLocked.status
      if (statusLocked !== 'PENDENTE' && statusLocked !== 'REJEITADA') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_STATUS_INVALIDO)
      }

      if (prestacaoLocked.viagem.solicitacao.status !== 'AGUARDANDO_PC') {
        throw new FinanceiroBusinessError(MSG_SOLICITACAO_STATUS_INVALIDO_ENVIO)
      }

      validarItensDespesaComComprovante(prestacaoLocked.viagem.itens_despesa)

      const valorTotal = prestacaoLocked.viagem.itens_despesa.reduce(
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
        where: { id: prestacaoLocked.viagem.solicitacao.id },
        data: { status: 'PC_EM_ANALISE' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: prestacaoLocked.viagem.solicitacao.processo_id,
          tipo: 'PRESTACAO_ENVIADA',
          descricao: `Prestação de contas da viagem ${prestacaoLocked.viagem.sequencia} enviada para análise (total ${formatValorBrl(valorTotal)}).`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: prestacaoLocked.id,
            viagemId: prestacaoLocked.viagem.id,
            valorTotal,
            quantidadeItens: prestacaoLocked.viagem.itens_despesa.length,
          },
        },
        tx
      )

      return {
        prestacaoId: prestacaoLocked.id,
        solicitacaoId: prestacaoLocked.viagem.solicitacao.id,
        processoId: prestacaoLocked.viagem.solicitacao.processo_id,
        sequenciaViagem: prestacaoLocked.viagem.sequencia,
        valorTotal,
        quantidadeItens: prestacaoLocked.viagem.itens_despesa.length,
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

    if (
      prestacao.status !== 'ENVIADA' ||
      prestacao.viagem.solicitacao.status !== 'PC_EM_ANALISE'
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
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ANALISE_APENAS)
      }

      if (prestacaoLocked.viagem.solicitacao.status !== 'PC_EM_ANALISE') {
        throw new FinanceiroBusinessError(MSG_PRESTACAO_ANALISE_APENAS)
      }

      const itemDespesa = await tx.tfdItemDespesa.findFirst({
        where: {
          tenant_id: tenantId,
          viagem_id: prestacaoLocked.viagem_id,
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
        solicitacaoId: prestacaoLocked.viagem.solicitacao.id,
        processoId: prestacaoLocked.viagem.solicitacao.processo_id,
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
        protocolo: prestacao.viagem.solicitacao.processo.protocolo,
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

    if (prestacao.status !== 'ENVIADA') {
      return { success: false, error: MSG_PRESTACAO_ENVIADA_APENAS }
    }

    if (prestacao.viagem.solicitacao.status !== 'PC_EM_ANALISE') {
      return { success: false, error: MSG_TRANSICAO_INVALIDA }
    }

    const protocolo = prestacao.viagem.solicitacao.processo.protocolo
    const especialidadeNome =
      prestacao.viagem.solicitacao.especialidade?.nome ?? 'Não informada'
    const servidorResponsavelId =
      prestacao.viagem.solicitacao.processo.aberto_por_id ??
      prestacao.viagem.solicitacao.solicitante_id
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

        if (prestacaoLocked.viagem.solicitacao.status !== 'PC_EM_ANALISE') {
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
          where: { id: prestacaoLocked.viagem.solicitacao.id },
          data: { status: 'AGUARDANDO_PC' },
        })

        await registrarTramitacao(
          {
            tenantId,
            processoId: prestacaoLocked.viagem.solicitacao.processo_id,
            tipo: 'PRESTACAO_REJEITADA',
            descricao: `Prestação de contas da viagem ${prestacaoLocked.viagem.sequencia} rejeitada. ${observacoesGestor}`,
            usuarioId: session.user.id,
            metadata: {
              prestacaoId: prestacaoLocked.id,
              viagemId: prestacaoLocked.viagem.id,
            },
          },
          tx
        )

        return {
          prestacaoId: prestacaoLocked.id,
          solicitacaoId: prestacaoLocked.viagem.solicitacao.id,
          processoId: prestacaoLocked.viagem.solicitacao.processo_id,
          sequenciaViagem: prestacaoLocked.viagem.sequencia,
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
      assertTodosComprovantesVisualizados(
        prestacao.viagem.itens_despesa,
        comprovantesVistos
      )
    } catch (error) {
      if (error instanceof FinanceiroBusinessError) {
        return { success: false, error: error.message }
      }
      throw error
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

      if (prestacaoLocked.viagem.solicitacao.status !== 'PC_EM_ANALISE') {
        throw new FinanceiroBusinessError(MSG_TRANSICAO_INVALIDA)
      }

      assertTodosComprovantesVisualizados(
        prestacaoLocked.viagem.itens_despesa,
        parseComprovantesVistos(prestacaoLocked.comprovantes_vistos)
      )

      validarItensDespesaComComprovante(prestacaoLocked.viagem.itens_despesa)

      const valorReal = roundMoney(
        prestacaoLocked.viagem.itens_despesa.reduce(
          (acc, item) => acc + Number(item.valor),
          0
        )
      )

      const reservaLocked = await lockReservaForUpdate(
        tx,
        tenantId,
        prestacaoLocked.viagem.solicitacao.id
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
          solicitacao_id: prestacaoLocked.viagem.solicitacao.id,
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
            solicitacao_id: prestacaoLocked.viagem.solicitacao.id,
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
        where: { id: prestacaoLocked.viagem.solicitacao.id },
        data: { status: 'CONCLUIDO' },
      })

      await tx.processo.update({
        where: { id: prestacaoLocked.viagem.solicitacao.processo_id },
        data: { status: 'CONCLUIDO' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: prestacaoLocked.viagem.solicitacao.processo_id,
          tipo: 'PRESTACAO_APROVADA',
          descricao: `Prestação de contas da viagem ${prestacaoLocked.viagem.sequencia} aprovada (total ${formatValorBrl(valorReal)}).`,
          usuarioId: session.user.id,
          metadata: {
            prestacaoId: prestacaoLocked.id,
            viagemId: prestacaoLocked.viagem.id,
            valorReal,
            valorReservado,
            valorLiberacao,
          },
        },
        tx
      )

      return {
        prestacaoId: prestacaoLocked.id,
        solicitacaoId: prestacaoLocked.viagem.solicitacao.id,
        processoId: prestacaoLocked.viagem.solicitacao.processo_id,
        sequenciaViagem: prestacaoLocked.viagem.sequencia,
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
