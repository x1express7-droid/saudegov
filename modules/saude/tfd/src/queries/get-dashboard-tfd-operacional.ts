import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdStatusSolicitacao, TfdUrgencia, TramitacaoTipo } from '@prisma/client'

import type {
  TfdAlertaAgendamentoSemTransporte,
  TfdAlertaPrazoAnalise,
  TfdAlertaPrazoAnaliseMotivo,
  TfdAlertaUrgenciaSemResposta,
  TfdAtividadeRecenteItem,
  TfdDashboardOperacionalOutput,
} from '../types/tfd.types'
import { adicionarDiasUteis, contarDiasUteisEntre } from '../utils/dias-uteis'
import { mascararNomePaciente } from '../utils/privacidade'

const MODULO_TFD = 'saude.tfd'
const PRAZO_ANALISE_DIAS_UTEIS = 5
const PRAZO_ANALISE_ALERTA_ANTES_DIAS = 4

const STATUS_PENDENTES: TfdStatusSolicitacao[] = ['ENVIADO']
const STATUS_EM_ANALISE: TfdStatusSolicitacao[] = ['EM_ANALISE', 'PENDENTE']
const STATUS_AGUARDANDO_DECISAO: TfdStatusSolicitacao[] = ['ENVIADO', 'EM_ANALISE', 'PENDENTE']
const URGENCIAS_PRIORITARIAS: TfdUrgencia[] = ['GRAVE', 'MUITO_URGENTE']
const URGENCIAS_ELETIVAS: TfdUrgencia[] = ['NAO_AGUDA', 'BAIXA', 'INTERMEDIARIA']

const STATUS_APROVADOS_MES: TfdStatusSolicitacao[] = [
  'APROVADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
]

const TRAMITACAO_LABEL: Partial<Record<TramitacaoTipo, string>> = {
  ABERTURA: 'Abertura',
  ENVIO: 'Envio',
  ENCAMINHAMENTO: 'Encaminhamento',
  COMPLEMENTO_SOLICITADO: 'Complemento solicitado',
  COMPLEMENTO_ENVIADO: 'Complemento enviado',
  DECISAO: 'Decisão',
  AGENDAMENTO: 'Agendamento',
  RETORNO_REGISTRADO: 'Retorno registrado',
  PRESTACAO_ENVIADA: 'Prestação enviada',
  PRESTACAO_APROVADA: 'Prestação aprovada',
  PRESTACAO_REJEITADA: 'Prestação rejeitada',
  CANCELAMENTO: 'Cancelamento',
  CONCLUSAO: 'Conclusão',
  OBSERVACAO_INTERNA: 'Observação',
}

function startOfCurrentMonthUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function formatHoraSaida(hora: Date | null): string | null {
  if (!hora) {
    return null
  }
  const horas = hora.getUTCHours().toString().padStart(2, '0')
  const minutos = hora.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
}

function labelTramitacao(tipo: TramitacaoTipo): string {
  return TRAMITACAO_LABEL[tipo] ?? tipo
}

function motivoPrazoAnalise(
  urgencia: TfdUrgencia,
  createdAt: Date,
  agora: Date
): TfdAlertaPrazoAnaliseMotivo | null {
  if (URGENCIAS_PRIORITARIAS.includes(urgencia)) {
    return 'VENCIDO'
  }

  const diasUteis = contarDiasUteisEntre(createdAt, agora)
  const prazoLimite = adicionarDiasUteis(createdAt, PRAZO_ANALISE_DIAS_UTEIS)

  if (agora.getTime() >= prazoLimite.getTime()) {
    return 'VENCIDO'
  }
  if (diasUteis >= PRAZO_ANALISE_ALERTA_ANTES_DIAS) {
    return 'PROXIMO_VENCIMENTO'
  }
  return null
}

/**
 * KPIs, alertas e atividade recente do dashboard TFD para servidor/atendente.
 */
export async function getDashboardTfdOperacional(): Promise<TfdDashboardOperacionalOutput> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const agora = new Date()
  const inicioMes = startOfCurrentMonthUtc()
  const em24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000)

  const filtroMesDecisao = {
    tenant_id: tenantId,
    decidido_at: { gte: inicioMes },
  }

  const [
    pendentes,
    emAnalise,
    aprovadasMes,
    negadasMes,
    canceladasMes,
    solicitacoesAguardando,
    viagensProximas,
    tramitacoes,
  ] = await Promise.all([
    db.tfdSolicitacao.count({
      where: { tenant_id: tenantId, status: { in: STATUS_PENDENTES } },
    }),
    db.tfdSolicitacao.count({
      where: { tenant_id: tenantId, status: { in: STATUS_EM_ANALISE } },
    }),
    db.tfdSolicitacao.count({
      where: {
        ...filtroMesDecisao,
        status: { in: STATUS_APROVADOS_MES },
      },
    }),
    db.tfdSolicitacao.count({
      where: { ...filtroMesDecisao, status: 'NEGADO' },
    }),
    db.tfdSolicitacao.count({
      where: {
        tenant_id: tenantId,
        cancelado_at: { gte: inicioMes },
        status: 'CANCELADO',
      },
    }),
    db.tfdSolicitacao.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: STATUS_AGUARDANDO_DECISAO },
        decidido_at: null,
      },
      select: {
        id: true,
        status: true,
        urgencia: true,
        created_at: true,
        paciente: { select: { nome: true } },
        processo: { select: { protocolo: true } },
      },
      orderBy: { created_at: 'asc' },
    }),
    db.tfdViagemLegado.findMany({
      where: {
        tenant_id: tenantId,
        status: 'AGENDADA',
        OR: [{ motorista_id: null }, { veiculo_id: null }],
      },
      select: {
        id: true,
        data_viagem: true,
        hora_saida: true,
        motorista_id: true,
        veiculo_id: true,
        solicitacao: {
          select: {
            id: true,
            paciente: { select: { nome: true } },
            processo: { select: { protocolo: true } },
          },
        },
      },
      orderBy: { data_viagem: 'asc' },
      take: 50,
    }),
    db.tramitacao.findMany({
      where: {
        tenant_id: tenantId,
        visivel_servidor: true,
        processo: { modulo: MODULO_TFD },
      },
      select: {
        id: true,
        tipo: true,
        descricao: true,
        created_at: true,
        processo: {
          select: {
            protocolo: true,
            tfd_solicitacoes: {
              take: 1,
              select: {
                id: true,
                status: true,
                paciente: { select: { nome: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
  ])

  const alertasPrazo: TfdAlertaPrazoAnalise[] = []
  const alertasUrgencia: TfdAlertaUrgenciaSemResposta[] = []

  for (const row of solicitacoesAguardando) {
    const pacienteNomeParcial = mascararNomePaciente(row.paciente.nome)

    if (URGENCIAS_PRIORITARIAS.includes(row.urgencia)) {
      alertasUrgencia.push({
        solicitacaoId: row.id,
        protocolo: row.processo.protocolo,
        urgencia: row.urgencia,
        status: row.status,
        pacienteNomeParcial,
        criadoEm: row.created_at.toISOString(),
      })
      continue
    }

    const motivo = motivoPrazoAnalise(row.urgencia, row.created_at, agora)
    if (motivo) {
      alertasPrazo.push({
        solicitacaoId: row.id,
        protocolo: row.processo.protocolo,
        urgencia: row.urgencia,
        status: row.status,
        motivo,
        diasUteisDecorridos: URGENCIAS_ELETIVAS.includes(row.urgencia)
          ? contarDiasUteisEntre(row.created_at, agora)
          : 0,
        pacienteNomeParcial,
      })
    }
  }

  const alertasTransporte: TfdAlertaAgendamentoSemTransporte[] = []

  for (const viagem of viagensProximas) {
    const dataViagem = viagem.data_viagem
    const horaSaida = viagem.hora_saida
    const instanteViagem = horaSaida
      ? new Date(
          Date.UTC(
            dataViagem.getUTCFullYear(),
            dataViagem.getUTCMonth(),
            dataViagem.getUTCDate(),
            horaSaida.getUTCHours(),
            horaSaida.getUTCMinutes()
          )
        )
      : new Date(
          Date.UTC(
            dataViagem.getUTCFullYear(),
            dataViagem.getUTCMonth(),
            dataViagem.getUTCDate(),
            23,
            59
          )
        )

    if (instanteViagem.getTime() < agora.getTime() || instanteViagem.getTime() > em24h.getTime()) {
      continue
    }

    alertasTransporte.push({
      viagemId: viagem.id,
      solicitacaoId: viagem.solicitacao.id,
      protocolo: viagem.solicitacao.processo.protocolo,
      dataViagem: dataViagem.toISOString().slice(0, 10),
      horaSaida: formatHoraSaida(horaSaida),
      pacienteNomeParcial: mascararNomePaciente(viagem.solicitacao.paciente.nome),
      faltaMotorista: viagem.motorista_id === null,
      faltaVeiculo: viagem.veiculo_id === null,
    })
  }

  const atividadeRecente: TfdAtividadeRecenteItem[] = []

  for (const item of tramitacoes) {
    const solicitacao = item.processo.tfd_solicitacoes[0]
    if (!solicitacao) {
      continue
    }

    atividadeRecente.push({
      id: item.id,
      criadoEm: item.created_at.toISOString(),
      tipoAcao: labelTramitacao(item.tipo),
      descricaoAcao: item.descricao,
      pacienteNomeParcial: mascararNomePaciente(solicitacao.paciente.nome),
      protocolo: item.processo.protocolo,
      solicitacaoId: solicitacao.id,
      statusAtual: solicitacao.status,
    })
  }

  return {
    kpis: {
      pendentes,
      emAnalise,
      aprovadasMes,
      negadasCanceladasMes: negadasMes + canceladasMes,
    },
    alertas: {
      prazoAnalise: alertasPrazo,
      urgenciaSemResposta: alertasUrgencia,
      agendamentosSemTransporte: alertasTransporte,
    },
    atividadeRecente,
  }
}
