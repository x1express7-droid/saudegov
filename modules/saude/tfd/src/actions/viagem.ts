'use server'

import { revalidatePath } from 'next/cache'
import { fromZonedTime } from 'date-fns-tz'
import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog, registrarTramitacao } from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import { calcMinDataAgendamento72h, calcPrazoEnvioPrestacao, isCnhVencida } from '../utils/prazos'
import { calcProximaSequenciaViagem, verificaCapacidadeVeiculo } from '../utils/viagem'
import { gerarProtocoloTfd } from '../utils/gerar-protocolo-tfd'
import { getMotoristasAgendamentoTfd } from '../queries/get-motoristas-agendamento'
import type { TfdMotoristaAgendamentoItem } from '../types/tfd.types'
import { criarAgendamentoSchema, registrarRetornoSchema } from '../validators/agendamento.schema'

const dataViagemListagemSchema = criarAgendamentoSchema.pick({ dataViagem: true })

const MODULO_TFD = 'saude.tfd'
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

const MSG_STATUS_INVALIDO =
  'A solicitação precisa estar aprovada ou já agendada para registrar uma nova viagem.'
const MSG_VEICULO_NAO_ENCONTRADO = 'Veículo não encontrado ou inativo.'
const MSG_CAPACIDADE_INSUFICIENTE =
  'O veículo selecionado não comporta o paciente e o acompanhante necessários.'
const MSG_MOTORISTA_NAO_ENCONTRADO = 'Motorista não encontrado ou inativo.'
const MSG_CNH_INVALIDA = 'A CNH do motorista não é válida na data da viagem.'
const MSG_ANTECEDENCIA_72H =
  'A data e hora da viagem devem ser pelo menos 72 horas após o momento do agendamento.'
const MSG_VIAGEM_NAO_ENCONTRADA = 'Viagem não encontrada.'
const MSG_VIAGEM_STATUS_INVALIDO =
  'O retorno só pode ser registrado para viagens agendadas que ainda não foram finalizadas.'
const MSG_SOLICITACAO_STATUS_INVALIDO =
  'A solicitação precisa estar agendada ou em viagem para registrar o retorno.'
const MSG_PRESTACAO_JA_EXISTE = 'A prestação de contas desta viagem já foi iniciada.'

class AgendamentoBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgendamentoBusinessError'
  }
}

class RetornoBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetornoBusinessError'
  }
}

function resolveTenantTimezone(settings: unknown): string {
  if (typeof settings !== 'object' || settings === null) {
    return DEFAULT_TIMEZONE
  }

  const timezone = (settings as Record<string, unknown>).timezone
  return typeof timezone === 'string' && timezone.trim() !== ''
    ? timezone.trim()
    : DEFAULT_TIMEZONE
}

function parseDataViagemUtc(dataViagem: string): Date {
  const [year, month, day] = dataViagem.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

function parseHoraSaidaUtc(horaSaida: string | undefined): Date | null {
  if (!horaSaida) {
    return null
  }

  const [hours, minutes] = horaSaida.split(':').map(Number) as [number, number]
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0))
}

function buildInicioViagemInstant(
  dataViagem: string,
  horaSaida: string | undefined,
  timezone: string
): Date {
  const [year, month, day] = dataViagem.split('-').map(Number) as [number, number, number]
  const [hours, minutes] = (horaSaida ?? '00:00').split(':').map(Number) as [number, number]
  return fromZonedTime(new Date(year, month - 1, day, hours, minutes, 0, 0), timezone)
}

export async function criarAgendamentoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ viagemId: string; sequencia: number }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.AGENDAR_VIAGEM)

  const parsed = criarAgendamentoSchema.safeParse(rawInput)
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

    const solicitacao = await db.tfdSolicitacao.findFirst({
      where: {
        id: data.solicitacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        acompanhante_necessario: true,
        processo_id: true,
        protocolo: true,
        urgencia: true,
        especialidade: { select: { nome: true } },
      },
    })

    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' }
    }

    if (solicitacao.status !== 'APROVADO' && solicitacao.status !== 'AGENDADO') {
      return { success: false, error: MSG_STATUS_INVALIDO }
    }

    const veiculo = await db.tfdVeiculo.findFirst({
      where: {
        id: data.veiculoId,
        tenant_id: tenantId,
        ativo: true,
      },
      select: {
        id: true,
        capacidade_passageiros: true,
      },
    })

    if (!veiculo) {
      return { success: false, error: MSG_VEICULO_NAO_ENCONTRADO }
    }

    if (
      !verificaCapacidadeVeiculo(veiculo.capacidade_passageiros, solicitacao.acompanhante_necessario)
    ) {
      return { success: false, error: MSG_CAPACIDADE_INSUFICIENTE }
    }

    const motorista = await db.tfdMotorista.findFirst({
      where: {
        id: data.motoristaId,
        tenant_id: tenantId,
        ativo: true,
      },
      select: {
        id: true,
        cnh_validade: true,
      },
    })

    if (!motorista) {
      return { success: false, error: MSG_MOTORISTA_NAO_ENCONTRADO }
    }

    const dataReferenciaCnh = parseDataViagemUtc(data.dataViagem)
    if (isCnhVencida(motorista.cnh_validade, dataReferenciaCnh)) {
      return { success: false, error: MSG_CNH_INVALIDA }
    }

    const inicioViagem = buildInicioViagemInstant(data.dataViagem, data.horaSaida, timezone)
    const minimoPermitido = calcMinDataAgendamento72h(new Date(), timezone)

    if (inicioViagem < minimoPermitido) {
      return { success: false, error: MSG_ANTECEDENCIA_72H }
    }

    const protocoloSolicitacao = solicitacao.protocolo
    const especialidadeNome = solicitacao.especialidade?.nome ?? 'Não informada'
    const dataViagemDb = parseDataViagemUtc(data.dataViagem)
    const horaSaidaDb = parseHoraSaidaUtc(data.horaSaida)

    const resultado = await db.$transaction(async (tx) => {
      const solicitacaoLocked = await tx.tfdSolicitacao.findFirst({
        where: {
          id: data.solicitacaoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          processo_id: true,
        },
      })

      if (!solicitacaoLocked) {
        throw new AgendamentoBusinessError('Solicitação não encontrada.')
      }

      if (solicitacaoLocked.status !== 'APROVADO' && solicitacaoLocked.status !== 'AGENDADO') {
        throw new AgendamentoBusinessError(MSG_STATUS_INVALIDO)
      }

      const viagensExistentes = await tx.tfdViagemLegado.count({
        where: {
          tenant_id: tenantId,
          solicitacao_id: solicitacaoLocked.id,
        },
      })

      const sequencia = calcProximaSequenciaViagem(viagensExistentes)
      const protocolo = await gerarProtocoloTfd(tenantId, 'VIAGEM', tx)

      const viagem = await tx.tfdViagemLegado.create({
        data: {
          tenant_id: tenantId,
          solicitacao_id: solicitacaoLocked.id,
          protocolo,
          sequencia,
          data_viagem: dataViagemDb,
          hora_saida: horaSaidaDb,
          veiculo_id: veiculo.id,
          motorista_id: motorista.id,
          observacoes: data.observacoes?.trim() || null,
          status: 'AGENDADA',
        },
        select: {
          id: true,
          sequencia: true,
        },
      })

      const statusAnterior = solicitacaoLocked.status

      if (solicitacaoLocked.status === 'APROVADO') {
        await tx.tfdSolicitacao.update({
          where: { id: solicitacaoLocked.id },
          data: { status: 'AGENDADO' },
        })
      }

      const descricaoTramitacao =
        data.horaSaida !== undefined
          ? `Viagem ${sequencia} agendada para ${data.dataViagem} às ${data.horaSaida}.`
          : `Viagem ${sequencia} agendada para ${data.dataViagem}.`

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacaoLocked.processo_id,
          tipo: 'AGENDAMENTO',
          descricao: descricaoTramitacao,
          usuarioId: session.user.id,
          metadata: {
            viagemId: viagem.id,
            sequencia,
            dataViagem: data.dataViagem,
            veiculoId: veiculo.id,
            motoristaId: motorista.id,
          },
        },
        tx
      )

      return {
        viagemId: viagem.id,
        sequencia: viagem.sequencia,
        solicitacaoId: solicitacaoLocked.id,
        processoId: solicitacaoLocked.processo_id,
        statusAnterior,
        statusNovo: statusAnterior === 'APROVADO' ? ('AGENDADO' as const) : statusAnterior,
        protocolo,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_viagem',
      entidadeId: resultado.viagemId,
      payloadDepois: {
        solicitacaoId: resultado.solicitacaoId,
        sequencia: resultado.sequencia,
        dataViagem: data.dataViagem,
        horaSaida: data.horaSaida ?? null,
        veiculoId: veiculo.id,
        motoristaId: motorista.id,
        statusSolicitacaoAnterior: resultado.statusAnterior,
        statusSolicitacaoNovo: resultado.statusNovo,
        protocolo: resultado.protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.AGENDAMENTO_TFD_CRIADO,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo: resultado.protocolo,
        especialidade: especialidadeNome,
        urgencia: solicitacao.urgencia,
      },
      excludeUserIds: [session.user.id],
    })

    revalidatePath('/saude/tfd')
    revalidatePath('/saude/tfd/agendamentos')
    revalidatePath(`/saude/tfd/${resultado.solicitacaoId}`)

    return {
      success: true,
      data: {
        viagemId: resultado.viagemId,
        sequencia: resultado.sequencia,
      },
    }
  } catch (error) {
    if (error instanceof AgendamentoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[criarAgendamentoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar o agendamento. Tente novamente.',
    }
  }
}

export async function registrarRetornoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ prestacaoId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.REGISTRAR_RETORNO)

  const parsed = registrarRetornoSchema.safeParse(rawInput)
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

    const viagem = await db.tfdViagemLegado.findFirst({
      where: {
        id: data.viagemId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        data_viagem: true,
        sequencia: true,
        prestacao_conta: { select: { id: true } },
        solicitacao: {
          select: {
            id: true,
            status: true,
            processo_id: true,
            saldo_id: true,
            solicitante_id: true,
            urgencia: true,
            especialidade: { select: { nome: true } },
            processo: { select: { protocolo: true, aberto_por_id: true } },
          },
        },
      },
    })

    if (!viagem) {
      return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
    }

    if (viagem.status !== 'AGENDADA') {
      return { success: false, error: MSG_VIAGEM_STATUS_INVALIDO }
    }

    if (viagem.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_JA_EXISTE }
    }

    const statusSolicitacao = viagem.solicitacao.status
    if (statusSolicitacao !== 'EM_VIAGEM' && statusSolicitacao !== 'AGENDADO') {
      return { success: false, error: MSG_SOLICITACAO_STATUS_INVALIDO }
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })

    const timezone = resolveTenantTimezone(tenant?.settings)
    const prazoEnvioAt = calcPrazoEnvioPrestacao(viagem.data_viagem, timezone)
    const protocolo = viagem.solicitacao.processo.protocolo
    const especialidadeNome = viagem.solicitacao.especialidade?.nome ?? 'Não informada'
    const servidorResponsavelId =
      viagem.solicitacao.processo.aberto_por_id ?? viagem.solicitacao.solicitante_id
    const retornoRegistradoAt = new Date()

    const resultado = await db.$transaction(async (tx) => {
      const viagemLocked = await tx.tfdViagemLegado.findFirst({
        where: {
          id: data.viagemId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          data_viagem: true,
          sequencia: true,
          solicitacao_id: true,
          solicitacao: {
            select: {
              id: true,
              status: true,
              processo_id: true,
              saldo_id: true,
            },
          },
          prestacao_conta: { select: { id: true } },
        },
      })

      if (!viagemLocked) {
        throw new RetornoBusinessError(MSG_VIAGEM_NAO_ENCONTRADA)
      }

      if (viagemLocked.status !== 'AGENDADA') {
        throw new RetornoBusinessError(MSG_VIAGEM_STATUS_INVALIDO)
      }

      if (viagemLocked.prestacao_conta) {
        throw new RetornoBusinessError(MSG_PRESTACAO_JA_EXISTE)
      }

      const statusSolLocked = viagemLocked.solicitacao.status
      if (statusSolLocked !== 'EM_VIAGEM' && statusSolLocked !== 'AGENDADO') {
        throw new RetornoBusinessError(MSG_SOLICITACAO_STATUS_INVALIDO)
      }

      await tx.tfdViagemLegado.update({
        where: { id: viagemLocked.id },
        data: {
          status: 'REALIZADA',
          retorno_registrado_at: retornoRegistradoAt,
        },
      })

      const prestacao = await tx.tfdPrestacaoConta.create({
        data: {
          tenant_id: tenantId,
          viagem_id: viagemLocked.id,
          saldo_id: viagemLocked.solicitacao.saldo_id,
          status: 'PENDENTE',
          prazo_envio_at: prazoEnvioAt,
        },
        select: { id: true },
      })

      const viagensAgendadasRestantes = await tx.tfdViagemLegado.count({
        where: {
          tenant_id: tenantId,
          solicitacao_id: viagemLocked.solicitacao_id,
          status: 'AGENDADA',
        },
      })

      let statusSolicitacaoNovo: typeof statusSolLocked | 'AGUARDANDO_PC' = statusSolLocked

      if (viagensAgendadasRestantes === 0) {
        await tx.tfdSolicitacao.update({
          where: { id: viagemLocked.solicitacao.id },
          data: { status: 'AGUARDANDO_PC' },
        })
        statusSolicitacaoNovo = 'AGUARDANDO_PC'
      }

      const dataViagemLabel = viagemLocked.data_viagem.toISOString().slice(0, 10)

      await registrarTramitacao(
        {
          tenantId,
          processoId: viagemLocked.solicitacao.processo_id,
          tipo: 'RETORNO_REGISTRADO',
          descricao: `Retorno da viagem ${viagemLocked.sequencia} registrado (${dataViagemLabel}). Prestação de contas com prazo até ${prazoEnvioAt.toISOString().slice(0, 10)}.`,
          usuarioId: session.user.id,
          metadata: {
            viagemId: viagemLocked.id,
            sequencia: viagemLocked.sequencia,
            prestacaoId: prestacao.id,
            prazoEnvioAt: prazoEnvioAt.toISOString(),
          },
        },
        tx
      )

      return {
        prestacaoId: prestacao.id,
        viagemId: viagemLocked.id,
        solicitacaoId: viagemLocked.solicitacao.id,
        processoId: viagemLocked.solicitacao.processo_id,
        statusSolicitacaoAnterior: statusSolLocked,
        statusSolicitacaoNovo,
        sequencia: viagemLocked.sequencia,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_viagem',
      entidadeId: resultado.viagemId,
      payloadDepois: {
        viagemId: resultado.viagemId,
        prestacaoId: resultado.prestacaoId,
        sequencia: resultado.sequencia,
        statusViagem: 'REALIZADA',
        statusSolicitacaoAnterior: resultado.statusSolicitacaoAnterior,
        statusSolicitacaoNovo: resultado.statusSolicitacaoNovo,
        prazoEnvioAt: prazoEnvioAt.toISOString(),
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    if (servidorResponsavelId) {
      await dispararNotificacao({
        tenantId,
        evento: NOTIFICATION_EVENTS.RETORNO_REGISTRADO,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
        context: {
          protocolo,
          especialidade: especialidadeNome,
          urgencia: viagem.solicitacao.urgencia,
        },
        recipientUserIds: [servidorResponsavelId],
        excludeUserIds: [session.user.id],
      })
    }

    revalidatePath('/saude/tfd')
    revalidatePath('/saude/tfd/agendamentos')
    revalidatePath(`/saude/tfd/${resultado.solicitacaoId}`)

    return {
      success: true,
      data: { prestacaoId: resultado.prestacaoId },
    }
  } catch (error) {
    if (error instanceof RetornoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarRetornoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar o retorno. Tente novamente.',
    }
  }
}

/** Lista motoristas com CNH válida na data — uso no formulário de agendamento (client). */
export async function listarMotoristasAgendamentoTfd(
  rawInput: unknown
): Promise<ActionResponse<TfdMotoristaAgendamentoItem[]>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.AGENDAR_VIAGEM)

  const parsed = dataViagemListagemSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Data da viagem inválida.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const items = await getMotoristasAgendamentoTfd(parsed.data.dataViagem)
    return { success: true, data: items }
  } catch (error) {
    console.error('[listarMotoristasAgendamentoTfd] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível carregar os motoristas disponíveis.',
    }
  }
}
