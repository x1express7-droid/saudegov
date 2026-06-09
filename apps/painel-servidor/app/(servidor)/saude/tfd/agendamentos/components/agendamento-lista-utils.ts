import type { TfdAgendamentoConsultaListItem } from '@saude/mod-saude-tfd/client'
import { TFD_STATUS_CONFIG, type TfdStatus } from '@saude/ui'

// BLOCO-9-AGENDAMENTOS
export const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

export function formatDataHoraAgendamento(dataConsulta: string, horaConsulta: string | null): string {
  const parsed = dataConsulta.length === 10 ? `${dataConsulta}T12:00:00` : dataConsulta
  const data = new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return horaConsulta ? `${data} às ${horaConsulta}` : data
}

export function labelTipoAtendimento(tipo: string): string {
  return TIPO_ATENDIMENTO_LABEL[tipo] ?? tipo
}

export function labelPrestadorNome(item: TfdAgendamentoConsultaListItem): string {
  return item.prestador.nome ?? '—'
}

export function tooltipPrestadorLocal(item: TfdAgendamentoConsultaListItem): string | undefined {
  const { prestador } = item
  if (!prestador.cidade || !prestador.estado) {
    return undefined
  }
  return `${prestador.cidade}/${prestador.estado}`
}

export function agendamentoDetalheHref(item: Pick<TfdAgendamentoConsultaListItem, 'processoId' | 'id'>): string {
  return `/saude/tfd/processos/${item.processoId}/agendamentos/${item.id}`
}

export function asAgendamentoStatusBadge(status: string): TfdStatus {
  if (status === 'REALIZADO') {
    return 'CONCLUIDO'
  }
  if (status in TFD_STATUS_CONFIG) {
    return status as TfdStatus
  }
  return 'RASCUNHO'
}

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
