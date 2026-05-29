'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog, registrarTramitacao } from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'
import type { TfdViagemStatusV2 } from '@prisma/client'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import { resolveTenantTimezone } from '../utils/agendamento-novo'
import { calcPrazoEnvioPrestacao } from '../utils/prazos'
import { gerarProtocoloViagemNova } from '../utils/gerar-protocolo-tfd'
import { transicionarAgendamentosParaRealizadoNaViagem } from '../utils/sync-agendamentos-viagem-nova'
import {
  cancelarViagemSchema,
  criarViagemSchema,
  desvincularPassageiroSchema,
  mudarStatusViagemSchema,
  registrarChegadaSchema,
  vincularAgendamentoSchema,
} from '../validators/viagem-nova.schema'

const MODULO_TFD = 'saude.tfd'

const MSG_PROCESSO_NAO_ENCONTRADO = 'Processo não encontrado.'
const MSG_VIAGEM_NAO_ENCONTRADA = 'Viagem não encontrada.'
const MSG_AGENDAMENTO_NAO_ENCONTRADO = 'Agendamento não encontrado.'
const MSG_VEICULO_NAO_ENCONTRADO = 'Veículo não encontrado ou inativo.'
const MSG_MOTORISTA_NAO_ENCONTRADO = 'Motorista não encontrado ou inativo.'
const MSG_CAPACIDADE_INSUFICIENTE =
  'Capacidade do veículo insuficiente para este agendamento e seus acompanhantes.'
const MSG_STATUS_DESVINCULAR_INVALIDO =
  'Somente viagens planejadas ou confirmadas permitem desvincular passageiros.'
const MSG_TRANSICAO_STATUS_INVALIDA = 'Transição de status não permitida.'
const MSG_STATUS_CHEGADA_INVALIDO =
  'A chegada só pode ser registrada para viagens em andamento.'
const MSG_STATUS_CANCELAR_INVALIDO =
  'Somente viagens planejadas ou confirmadas podem ser canceladas.'
const MSG_PASSAGEIRO_NAO_ENCONTRADO = 'Passageiro não vinculado a esta viagem.'
const MSG_VINCULO_DUPLICADO =
  'Este agendamento já está vinculado a esta viagem para o mesmo tipo de trecho.'
const MSG_PRESTACAO_JA_EXISTE = 'Prestação de contas já registrada para esta viagem.'

const TRANSICOES_PERMITIDAS: Partial<Record<TfdViagemStatusV2, TfdViagemStatusV2>> = {
  PLANEJADA: 'CONFIRMADA',
  CONFIRMADA: 'EM_ANDAMENTO',
  EM_ANDAMENTO: 'CONCLUIDA',
}

class ViagemNovaBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ViagemNovaBusinessError'
  }
}

function revalidateViagemPaths(viagemId?: string): void {
  revalidatePath('/saude/tfd/viagens')
  if (viagemId) {
    revalidatePath(`/saude/tfd/viagens/${viagemId}`)
  }
}

function parseDataUtc(data: string): Date {
  const [year, month, day] = data.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

function parseHoraUtc(hora: string | undefined): Date | null {
  if (!hora) {
    return null
  }

  const [hours, minutes] = hora.split(':').map(Number) as [number, number]
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0))
}

function calcularVagasOcupadas(passageiros: Array<{ acompanhantes_count: number }>): number {
  return passageiros.reduce((total, passageiro) => total + 1 + passageiro.acompanhantes_count, 0)
}

export interface CriarViagemOutput {
  viagemId: string
  protocolo: string
}

export async function criarViagem(
  rawInput: unknown
): Promise<ActionResponse<CriarViagemOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_VIAGEM)

  const parsed = criarViagemSchema.safeParse(rawInput)
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

    const processo = await db.processo.findFirst({
      where: {
        id: data.processoId,
        tenant_id: tenantId,
        modulo: MODULO_TFD,
      },
      select: {
        id: true,
        protocolo: true,
        tfd_solicitacoes: {
          take: 1,
          orderBy: { created_at: 'desc' },
          select: {
            urgencia: true,
            especialidade: { select: { nome: true } },
          },
        },
      },
    })

    if (!processo) {
      return { success: false, error: MSG_PROCESSO_NAO_ENCONTRADO }
    }

    if (data.veiculoId) {
      const veiculo = await db.tfdVeiculo.findFirst({
        where: { id: data.veiculoId, tenant_id: tenantId, ativo: true },
        select: { id: true },
      })
      if (!veiculo) {
        return { success: false, error: MSG_VEICULO_NAO_ENCONTRADO }
      }
    }

    if (data.motoristaId) {
      const motorista = await db.tfdMotorista.findFirst({
        where: { id: data.motoristaId, tenant_id: tenantId, ativo: true },
        select: { id: true },
      })
      if (!motorista) {
        return { success: false, error: MSG_MOTORISTA_NAO_ENCONTRADO }
      }
    }

    const resultado = await db.$transaction(async (tx) => {
      const protocolo = await gerarProtocoloViagemNova(tenantId, tx)

      const viagem = await tx.tfdViagem.create({
        data: {
          tenant_id: tenantId,
          protocolo,
          processo_id: data.processoId,
          veiculo_id: data.veiculoId ?? null,
          motorista_id: data.motoristaId ?? null,
          data_saida: parseDataUtc(data.dataSaida),
          hora_saida: parseHoraUtc(data.horaSaida),
          origem_descricao: data.origemDescricao,
          destino_descricao: data.destinoDescricao,
          tempo_estimado_min: data.tempoEstimadoMin ?? null,
          custo_estimado: data.custoEstimado ?? null,
          observacoes: data.observacoes ?? null,
        },
        select: { id: true, protocolo: true },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: data.processoId,
          tipo: 'VIAGEM_CRIADA',
          descricao: `Viagem ${protocolo} criada (${data.origemDescricao} → ${data.destinoDescricao}).`,
          usuarioId: session.user.id,
          metadata: {
            viagemId: viagem.id,
            protocolo,
            dataSaida: data.dataSaida,
          },
        },
        tx
      )

      return viagem
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_viagem',
      entidadeId: resultado.id,
      payloadDepois: {
        protocolo: resultado.protocolo,
        processoId: data.processoId,
        dataSaida: data.dataSaida,
        modulo: MODULO_TFD,
      },
    })

    if (data.veiculoId || data.motoristaId) {
      const solicitacao = processo.tfd_solicitacoes[0]
      await dispararNotificacao({
        tenantId,
        evento: NOTIFICATION_EVENTS.AGENDAMENTO_TFD_CRIADO,
        modulo: MODULO_TFD,
        processoId: data.processoId,
        context: {
          protocolo: processo.protocolo,
          especialidade: solicitacao?.especialidade?.nome ?? 'TFD',
          urgencia: solicitacao?.urgencia ?? 'BAIXA',
        },
      })
    }

    revalidateViagemPaths(resultado.id)

    return {
      success: true,
      data: {
        viagemId: resultado.id,
        protocolo: resultado.protocolo,
      },
    }
  } catch (error) {
    if (error instanceof ViagemNovaBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[criarViagem] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível completar a operação.' }
  }
}

export async function vincularAgendamentoNaViagem(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_VIAGEM)

  const parsed = vincularAgendamentoSchema.safeParse(rawInput)
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
        id: data.viagemId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        processo_id: true,
        veiculo: {
          select: {
            capacidade_passageiros: true,
          },
        },
        passageiros: {
          select: { acompanhantes_count: true },
        },
      },
    })

    if (!viagem) {
      return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
    }

    const agendamento = await db.tfdAgendamento.findFirst({
      where: {
        id: data.agendamentoId,
        tenant_id: tenantId,
        processo_id: viagem.processo_id,
      },
      select: {
        id: true,
        acompanhantes_vinculos: { select: { id: true } },
      },
    })

    if (!agendamento) {
      return { success: false, error: MSG_AGENDAMENTO_NAO_ENCONTRADO }
    }

    const acompanhantesCount = agendamento.acompanhantes_vinculos.length
    const ocupacaoNova = 1 + acompanhantesCount

    if (viagem.veiculo) {
      const vagasOcupadas = calcularVagasOcupadas(viagem.passageiros)
      if (vagasOcupadas + ocupacaoNova > viagem.veiculo.capacidade_passageiros) {
        return { success: false, error: MSG_CAPACIDADE_INSUFICIENTE }
      }
    }

    await db.$transaction(async (tx) => {
      try {
        await tx.tfdViagemPassageiro.create({
          data: {
            tenant_id: tenantId,
            viagem_id: data.viagemId,
            agendamento_id: data.agendamentoId,
            tipo_trecho: data.tipoTrecho,
            acompanhantes_count: acompanhantesCount,
          },
        })
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ViagemNovaBusinessError(MSG_VINCULO_DUPLICADO)
        }
        throw error
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_viagem_passageiro',
      entidadeId: data.agendamentoId,
      payloadDepois: {
        viagemId: data.viagemId,
        agendamentoId: data.agendamentoId,
        tipoTrecho: data.tipoTrecho,
        acompanhantesCount,
        modulo: MODULO_TFD,
      },
    })

    revalidateViagemPaths(data.viagemId)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof ViagemNovaBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[vincularAgendamentoNaViagem] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível completar a operação.' }
  }
}

export async function desvincularPassageiro(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_VIAGEM)

  const parsed = desvincularPassageiroSchema.safeParse(rawInput)
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
        id: data.viagemId,
        tenant_id: tenantId,
      },
      select: { id: true, status: true },
    })

    if (!viagem) {
      return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
    }

    if (viagem.status !== 'PLANEJADA' && viagem.status !== 'CONFIRMADA') {
      return { success: false, error: MSG_STATUS_DESVINCULAR_INVALIDO }
    }

    const passageiro = await db.tfdViagemPassageiro.findFirst({
      where: {
        tenant_id: tenantId,
        viagem_id: data.viagemId,
        agendamento_id: data.agendamentoId,
      },
      select: { id: true },
    })

    if (!passageiro) {
      return { success: false, error: MSG_PASSAGEIRO_NAO_ENCONTRADO }
    }

    await db.tfdViagemPassageiro.delete({
      where: { id: passageiro.id },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'DELETE',
      entidade: 'saude_tfd_viagem_passageiro',
      entidadeId: passageiro.id,
      payloadAntes: {
        viagemId: data.viagemId,
        agendamentoId: data.agendamentoId,
        modulo: MODULO_TFD,
      },
    })

    revalidateViagemPaths(data.viagemId)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desvincularPassageiro] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível completar a operação.' }
  }
}

export async function mudarStatusViagem(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_VIAGEM)

  const parsed = mudarStatusViagemSchema.safeParse(rawInput)
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

    const resultado = await db.$transaction(async (tx) => {
      const viagem = await tx.tfdViagem.findFirst({
        where: {
          id: data.viagemId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          protocolo: true,
          status: true,
          processo_id: true,
        },
      })

      if (!viagem) {
        throw new ViagemNovaBusinessError(MSG_VIAGEM_NAO_ENCONTRADA)
      }

      const statusEsperado = TRANSICOES_PERMITIDAS[viagem.status]
      if (!statusEsperado || statusEsperado !== data.novoStatus) {
        throw new ViagemNovaBusinessError(MSG_TRANSICAO_STATUS_INVALIDA)
      }

      await tx.tfdViagem.update({
        where: { id: viagem.id },
        data: { status: data.novoStatus },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagem.processo_id,
          tipo: 'VIAGEM_STATUS_ALTERADO',
          descricao: `Viagem ${viagem.protocolo}: status alterado para ${data.novoStatus}.${data.observacao ? ` ${data.observacao}` : ''}`,
          usuarioId: session.user.id,
          metadata: {
            viagemId: viagem.id,
            statusAnterior: viagem.status,
            statusNovo: data.novoStatus,
          },
        },
        tx
      )

      return viagem
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_viagem',
      entidadeId: resultado.id,
      payloadDepois: {
        status: data.novoStatus,
        protocolo: resultado.protocolo,
        modulo: MODULO_TFD,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.RETORNO_REGISTRADO,
      modulo: MODULO_TFD,
      processoId: resultado.processo_id,
      context: {
        protocolo: resultado.protocolo,
        especialidade: 'TFD',
        urgencia: 'BAIXA',
      },
    })

    revalidateViagemPaths(data.viagemId)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof ViagemNovaBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[mudarStatusViagem] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível completar a operação.' }
  }
}

export interface RegistrarChegadaViagemOutput {
  prestacaoId: string
}

export async function registrarChegadaViagem(
  rawInput: unknown
): Promise<ActionResponse<RegistrarChegadaViagemOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_VIAGEM)

  const parsed = registrarChegadaSchema.safeParse(rawInput)
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

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })
    const timezone = resolveTenantTimezone(tenant?.settings)
    const dataReferenciaPrazo = data.dataChegada
      ? parseDataUtc(data.dataChegada)
      : new Date()
    const prazoEnvioAt = calcPrazoEnvioPrestacao(dataReferenciaPrazo, timezone)

    const resultado = await db.$transaction(async (tx) => {
      const viagem = await tx.tfdViagem.findFirst({
        where: {
          id: data.viagemId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          protocolo: true,
          status: true,
          processo_id: true,
          prestacao_conta: { select: { id: true } },
        },
      })

      if (!viagem) {
        throw new ViagemNovaBusinessError(MSG_VIAGEM_NAO_ENCONTRADA)
      }

      if (viagem.status !== 'EM_ANDAMENTO') {
        throw new ViagemNovaBusinessError(MSG_STATUS_CHEGADA_INVALIDO)
      }

      if (viagem.prestacao_conta) {
        throw new ViagemNovaBusinessError(MSG_PRESTACAO_JA_EXISTE)
      }

      await tx.tfdViagem.update({
        where: { id: viagem.id },
        data: {
          status: 'CONCLUIDA',
          km_chegada: data.kmChegada ?? null,
          data_chegada: data.dataChegada ? parseDataUtc(data.dataChegada) : null,
          hora_chegada: parseHoraUtc(data.horaChegada),
          custo_real: data.custoReal ?? null,
        },
      })

      const agendamentosAtualizados = await transicionarAgendamentosParaRealizadoNaViagem(tx, {
        tenantId,
        viagemId: viagem.id,
        viagemProtocolo: viagem.protocolo,
        usuarioId: session.user.id,
        origem: 'registrar_chegada_viagem',
      })

      const prestacao = await tx.tfdPrestacaoConta.create({
        data: {
          tenant_id: tenantId,
          viagem_nova_id: viagem.id,
          saldo_id: null,
          status: 'PENDENTE',
          prazo_envio_at: prazoEnvioAt,
        },
        select: { id: true },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagem.processo_id,
          tipo: 'VIAGEM_CONCLUIDA',
          descricao: `Viagem ${viagem.protocolo} concluída.`,
          usuarioId: session.user.id,
          metadata: {
            viagemId: viagem.id,
            kmChegada: data.kmChegada ?? null,
            dataChegada: data.dataChegada ?? null,
          },
        },
        tx
      )

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagem.processo_id,
          tipo: 'PRESTACAO_CRIADA',
          descricao: `Prestação de contas da viagem ${viagem.protocolo} criada. Prazo de envio: ${prazoEnvioAt.toLocaleDateString('pt-BR')}.`,
          usuarioId: session.user.id,
          metadata: {
            viagemId: viagem.id,
            prestacaoId: prestacao.id,
            prazoEnvioAt: prazoEnvioAt.toISOString(),
          },
        },
        tx
      )

      return {
        viagemId: viagem.id,
        protocolo: viagem.protocolo,
        processoId: viagem.processo_id,
        prestacaoId: prestacao.id,
        agendamentosAtualizados,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_viagem',
      entidadeId: resultado.viagemId,
      payloadDepois: {
        status: 'CONCLUIDA',
        protocolo: resultado.protocolo,
        modulo: MODULO_TFD,
      },
    })

    for (const agendamento of resultado.agendamentosAtualizados) {
      await createAuditLog({
        tenantId,
        userId: session.user.id,
        acao: 'UPDATE',
        entidade: 'saude_tfd_agendamento',
        entidadeId: agendamento.id,
        payloadAntes: { status: 'EM_VIAGEM' },
        payloadDepois: {
          status: 'REALIZADO',
          sequencia: agendamento.sequencia,
          viagemId: resultado.viagemId,
          modulo: MODULO_TFD,
          origem: 'registrar_chegada_viagem',
        },
      })
    }

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_prestacao_conta',
      entidadeId: resultado.prestacaoId,
      payloadDepois: {
        viagemNovaId: resultado.viagemId,
        status: 'PENDENTE',
        prazoEnvioAt: prazoEnvioAt.toISOString(),
        processoId: resultado.processoId,
        modulo: MODULO_TFD,
      },
    })

    revalidateViagemPaths(data.viagemId)

    return { success: true, data: { prestacaoId: resultado.prestacaoId } }
  } catch (error) {
    if (error instanceof ViagemNovaBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarChegadaViagem] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível completar a operação.' }
  }
}

export async function cancelarViagem(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_VIAGEM)

  const parsed = cancelarViagemSchema.safeParse(rawInput)
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

    const resultado = await db.$transaction(async (tx) => {
      const viagem = await tx.tfdViagem.findFirst({
        where: {
          id: data.viagemId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          protocolo: true,
          status: true,
          processo_id: true,
          observacoes: true,
        },
      })

      if (!viagem) {
        throw new ViagemNovaBusinessError(MSG_VIAGEM_NAO_ENCONTRADA)
      }

      if (viagem.status !== 'PLANEJADA' && viagem.status !== 'CONFIRMADA') {
        throw new ViagemNovaBusinessError(MSG_STATUS_CANCELAR_INVALIDO)
      }

      const observacoesAtualizadas = viagem.observacoes
        ? `${viagem.observacoes}\n\n[CANCELAMENTO] ${data.motivo}`
        : `[CANCELAMENTO] ${data.motivo}`

      await tx.tfdViagem.update({
        where: { id: viagem.id },
        data: {
          status: 'CANCELADA',
          observacoes: observacoesAtualizadas,
        },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagem.processo_id,
          tipo: 'VIAGEM_CANCELADA',
          descricao: `Viagem ${viagem.protocolo} cancelada: ${data.motivo}`,
          usuarioId: session.user.id,
          metadata: {
            viagemId: viagem.id,
            motivo: data.motivo,
          },
        },
        tx
      )

      return viagem
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_viagem',
      entidadeId: resultado.id,
      payloadDepois: {
        status: 'CANCELADA',
        protocolo: resultado.protocolo,
        modulo: MODULO_TFD,
      },
    })

    revalidateViagemPaths(data.viagemId)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof ViagemNovaBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[cancelarViagem] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível completar a operação.' }
  }
}
