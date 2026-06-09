import { assertModuleActive, hasPermission, requireTenantRole } from '@saude/core-auth/server'

import { TFD_PERMISSIONS } from '../permissions'
import type {
  AlertaPrestacaoPrazo,
  GestaoTfdCentralAlertasGestor,
  GestaoTfdCentralOutput,
  GestaoTfdInboxCategoria,
  GestaoTfdInboxItem,
  GestaoTfdInboxPrioridade,
} from '../types/tfd.types'
import { mascararNomePaciente } from '../utils/privacidade'
import { getAlertasLembreteViagemTfd } from './get-alertas-lembrete-viagem'
import { getAlertasPendente60Dias } from './get-alertas-pendente-60-dias'
import { getAlertasPrestacaoTfd } from './get-alertas-prestacao'
import { getAlertasPendente30Dias } from './get-alertas-regulacao'
import { getAlertasUrgentesTfd } from './get-alertas-urgentes'
import { getDashboardFinanceiroTfd } from './get-dashboard-financeiro-tfd'
import { getDashboardTfdOperacional } from './get-dashboard-tfd-operacional'

const PRIORIDADE_ORDEM: Record<GestaoTfdInboxPrioridade, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
}

const CATEGORIA_INICIAL: Record<GestaoTfdInboxCategoria, number> = {
  regulacao: 0,
  transporte: 0,
  financeiro: 0,
  prestacao: 0,
  complemento: 0,
}

function pushInbox(
  items: GestaoTfdInboxItem[],
  item: GestaoTfdInboxItem
): void {
  items.push(item)
}

function buildInboxFromOperacional(
  operacional: Awaited<ReturnType<typeof getDashboardTfdOperacional>>
): GestaoTfdInboxItem[] {
  const items: GestaoTfdInboxItem[] = []

  for (const alerta of operacional.alertas.prazoAnalise) {
    pushInbox(items, {
      id: `prazo-${alerta.solicitacaoId}`,
      prioridade: alerta.motivo === 'VENCIDO' ? 'critica' : 'alta',
      categoria: 'regulacao',
      titulo:
        alerta.motivo === 'VENCIDO'
          ? 'Prazo de análise vencido'
          : 'Prazo de análise próximo do vencimento',
      descricao: `${alerta.diasUteisDecorridos} dias úteis · status ${alerta.status}`,
      protocolo: alerta.protocolo,
      pacienteNomeParcial: alerta.pacienteNomeParcial,
      href: `/saude/tfd/${alerta.solicitacaoId}`,
      referenciaEm: null,
    })
  }

  for (const alerta of operacional.alertas.urgenciaSemResposta) {
    pushInbox(items, {
      id: `urgencia-${alerta.solicitacaoId}`,
      prioridade: 'critica',
      categoria: 'regulacao',
      titulo: 'Urgência sem resposta',
      descricao: `Urgência ${alerta.urgencia} · status ${alerta.status}`,
      protocolo: alerta.protocolo,
      pacienteNomeParcial: alerta.pacienteNomeParcial,
      href: `/saude/tfd/${alerta.solicitacaoId}`,
      referenciaEm: alerta.criadoEm,
    })
  }

  for (const alerta of operacional.alertas.agendamentosSemTransporte) {
    const pendencias = [
      alerta.faltaMotorista ? 'motorista' : null,
      alerta.faltaVeiculo ? 'veículo' : null,
    ].filter((value): value is string => value !== null)

    pushInbox(items, {
      id: `transporte-${alerta.viagemId}`,
      prioridade: 'media',
      categoria: 'transporte',
      titulo: 'Agendamento sem transporte completo',
      descricao: `Falta: ${pendencias.join(' e ')} · viagem em ${alerta.dataViagem}`,
      protocolo: alerta.protocolo,
      pacienteNomeParcial: alerta.pacienteNomeParcial,
      href: `/saude/tfd/viagens/${alerta.viagemId}`,
      referenciaEm: alerta.dataViagem,
    })
  }

  return items
}

function buildInboxFromGestor(alertas: GestaoTfdCentralAlertasGestor): GestaoTfdInboxItem[] {
  const items: GestaoTfdInboxItem[] = []

  for (const alerta of alertas.alertasUrgentes) {
    pushInbox(items, {
      id: `muito-urgente-${alerta.solicitacaoId}`,
      prioridade: 'critica',
      categoria: 'regulacao',
      titulo: 'Solicitação muito urgente sem decisão',
      descricao: `${alerta.especialidade} · status ${alerta.status}`,
      protocolo: alerta.protocolo,
      pacienteNomeParcial: mascararNomePaciente(alerta.paciente.nome),
      href: `/saude/tfd/${alerta.solicitacaoId}`,
      referenciaEm: alerta.criadoEm,
    })
  }

  for (const alerta of alertas.alertasPendente30) {
    pushInbox(items, {
      id: `complemento-30-${alerta.id}`,
      prioridade: 'alta',
      categoria: 'complemento',
      titulo: 'Complemento pendente há mais de 30 dias',
      descricao: `${alerta.diasPendente} dias aguardando retorno`,
      protocolo: alerta.protocolo,
      pacienteNomeParcial: mascararNomePaciente(alerta.paciente.nome),
      href: `/saude/tfd/${alerta.id}`,
      referenciaEm: alerta.complementoSolicitadoEm,
    })
  }

  for (const alerta of alertas.alertasPendente60) {
    pushInbox(items, {
      id: `complemento-60-${alerta.id}`,
      prioridade: 'alta',
      categoria: 'complemento',
      titulo: 'Complemento pendente há mais de 60 dias',
      descricao: `${alerta.diasPendente} dias — elegível a cancelamento`,
      protocolo: alerta.protocolo,
      pacienteNomeParcial: mascararNomePaciente(alerta.paciente.nome),
      href: `/saude/tfd/${alerta.id}`,
      referenciaEm: alerta.complementoSolicitadoEm,
    })
  }

  for (const alerta of alertas.alertasPrestacao) {
    const prioridade: GestaoTfdInboxPrioridade =
      alerta.motivo === 'PRAZO_VENCIDO' ? 'alta' : 'media'

    const tituloPorMotivo: Record<AlertaPrestacaoPrazo['motivo'], string> = {
      PRAZO_VENCIDO: 'Prestação de contas com prazo vencido',
      PRAZO_VENCENDO: 'Prestação de contas vencendo em até 48h',
      LEMBRETE_FALHOU: 'Lembrete de prestação não enviado',
    }

    pushInbox(items, {
      id: `prestacao-${alerta.id}`,
      prioridade,
      categoria: 'prestacao',
      titulo: tituloPorMotivo[alerta.motivo],
      descricao: `Viagem ${alerta.sequenciaViagem} · prazo ${alerta.prazoEnvioAt}`,
      protocolo: alerta.solicitacao.protocolo,
      pacienteNomeParcial: null,
      href: `/saude/tfd/${alerta.solicitacao.id}`,
      referenciaEm: alerta.prazoEnvioAt,
    })
  }

  for (const alerta of alertas.alertasLembreteViagem) {
    pushInbox(items, {
      id: `lembrete-viagem-${alerta.id}`,
      prioridade: 'media',
      categoria: 'transporte',
      titulo: 'Falha no lembrete de viagem (48h)',
      descricao: `Viagem em ${alerta.dataViagem}`,
      protocolo: alerta.solicitacao.protocolo,
      pacienteNomeParcial: null,
      href: `/saude/tfd/${alerta.solicitacao.id}`,
      referenciaEm: alerta.lembrete48hFalhouAt,
    })
  }

  for (const saldo of alertas.saldosEmAlerta) {
    const percentual =
      saldo.valorTotal > 0
        ? Math.round((saldo.valorDisponivel / saldo.valorTotal) * 1000) / 10
        : 0

    pushInbox(items, {
      id: `saldo-${saldo.id}`,
      prioridade: 'baixa',
      categoria: 'financeiro',
      titulo: 'Saldo com disponível abaixo de 20%',
      descricao: `${saldo.descricao} · ${percentual}% disponível`,
      protocolo: null,
      pacienteNomeParcial: null,
      href: '/saude/tfd/saldos',
      referenciaEm: null,
    })
  }

  return items
}

function ordenarInbox(items: GestaoTfdInboxItem[]): GestaoTfdInboxItem[] {
  return [...items].sort((a, b) => {
    const diffPrioridade = PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade]
    if (diffPrioridade !== 0) {
      return diffPrioridade
    }

    const dataA = a.referenciaEm ? new Date(a.referenciaEm).getTime() : Number.MAX_SAFE_INTEGER
    const dataB = b.referenciaEm ? new Date(b.referenciaEm).getTime() : Number.MAX_SAFE_INTEGER
    return dataA - dataB
  })
}

function contarPorCategoria(items: GestaoTfdInboxItem[]): Record<GestaoTfdInboxCategoria, number> {
  const contagem = { ...CATEGORIA_INICIAL }
  for (const item of items) {
    contagem[item.categoria] += 1
  }
  return contagem
}

async function carregarAlertasGestor(): Promise<GestaoTfdCentralAlertasGestor> {
  const [
    alertasUrgentes,
    financeiro,
    alertasPrestacao,
    alertasPendente30,
    alertasPendente60,
    alertasLembreteViagem,
  ] = await Promise.all([
    getAlertasUrgentesTfd(),
    getDashboardFinanceiroTfd(),
    getAlertasPrestacaoTfd(),
    getAlertasPendente30Dias(),
    getAlertasPendente60Dias(),
    getAlertasLembreteViagemTfd(),
  ])

  return {
    alertasUrgentes,
    saldosEmAlerta: financeiro.saldosEmAlerta,
    alertasPrestacao,
    alertasPendente30,
    alertasPendente60,
    alertasLembreteViagem,
  }
}

/**
 * Central de Gestão TFD — inbox priorizada, alertas consolidados e atividade recente.
 */
export async function getGestaoTfdCentral(): Promise<GestaoTfdCentralOutput> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const isGestorView =
    hasPermission(session, TFD_PERMISSIONS.VER_DASHBOARD) &&
    (session.user.role === 'GESTOR' || session.user.role === 'ADMIN')

  const operacional = await getDashboardTfdOperacional()

  const alertasGestor = isGestorView ? await carregarAlertasGestor() : null

  const inboxBruto = [
    ...buildInboxFromOperacional(operacional),
    ...(alertasGestor ? buildInboxFromGestor(alertasGestor) : []),
  ]

  const inbox = ordenarInbox(inboxBruto)

  return {
    isGestorView,
    kpis: operacional.kpis,
    inbox,
    alertasOperacional: operacional.alertas,
    alertasGestor,
    atividadeRecente: operacional.atividadeRecente,
    totalInbox: inbox.length,
    inboxPorCategoria: contarPorCategoria(inbox),
  }
}
