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

export function formatDataHoraBr(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMoedaBrl(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
