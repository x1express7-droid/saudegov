import { formatDataHoraBr as formatDataHoraBrCore } from '@saude/core-documents'

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  EM_ANALISE: 'Em análise',
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  NEGADO: 'Negado',
  AGENDADO: 'Agendado',
  EM_VIAGEM: 'Em viagem',
  AGUARDANDO_PC: 'Aguardando PC',
  PC_EM_ANALISE: 'PC em análise',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

export function labelStatusTfd(status: string): string {
  return STATUS_LABEL[status] ?? status
}

export function formatCompetenciaLabel(mes: number, ano: number): string {
  const mesFormatado = String(mes).padStart(2, '0')
  return `${mesFormatado}/${ano}`
}

/**
 * Data/hora pt-BR para relatórios TFD; repassa timezone do município quando disponível.
 */
export function formatDataHoraBr(isoOrDate: string | Date, timezone?: string): string {
  return formatDataHoraBrCore(isoOrDate, timezone)
}

export function formatMoedaBrl(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
