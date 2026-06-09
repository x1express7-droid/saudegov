// BLOCO-12-RELATORIOS
export const RELATORIO_FILTRO_TODOS = '__todos__'

export const RATE_LIMIT_EXPORT_MESSAGE =
  'Limite de 3 exportações por hora atingido. Tente novamente em alguns minutos.'

export function formatExportErrorMessage(error: string): string {
  if (
    error.includes('Limite de exportações') ||
    error.includes('3 relatórios por hora') ||
    error.includes('EXPORT_RATE_LIMIT')
  ) {
    return RATE_LIMIT_EXPORT_MESSAGE
  }
  return error
}

export function parseMesAnoFromMonthInput(value: string): { mes: number; ano: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  const ano = Number.parseInt(match[1]!, 10)
  const mes = Number.parseInt(match[2]!, 10)
  if (mes < 1 || mes > 12) {
    return null
  }
  return { mes, ano }
}

export function defaultMonthInputValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function defaultPeriodoMesAtual(): { dataInicio: string; dataFim: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return {
    dataInicio: `${year}-${month}-01`,
    dataFim: `${year}-${month}-${day}`,
  }
}

export const STATUS_SOLICITACAO_OPTIONS = [
  { value: RELATORIO_FILTRO_TODOS, label: 'Status: todos' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'EM_ANALISE', label: 'Em análise' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'NEGADO', label: 'Negado' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'EM_VIAGEM', label: 'Em viagem' },
  { value: 'AGUARDANDO_PC', label: 'Aguardando PC' },
  { value: 'PC_EM_ANALISE', label: 'PC em análise' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'CANCELADO', label: 'Cancelado' },
] as const

export const URGENCIA_OPTIONS = [
  { value: RELATORIO_FILTRO_TODOS, label: 'Urgência: todas' },
  { value: 'NAO_AGUDA', label: 'Não aguda' },
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'INTERMEDIARIA', label: 'Intermediária' },
  { value: 'GRAVE', label: 'Grave' },
  { value: 'MUITO_URGENTE', label: 'Muito urgente' },
] as const

export const PRESTACAO_STATUS_OPTIONS = [
  { value: RELATORIO_FILTRO_TODOS, label: 'Status: todos' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
] as const

export const SALDO_STATUS_EXPORT_OPTIONS = [
  { value: 'todos', label: 'Status: todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
] as const

// BLOCO-13-RELATORIOS
export const AGENDAMENTO_STATUS_OPTIONS = [
  { value: RELATORIO_FILTRO_TODOS, label: 'Status: todos' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'EM_VIAGEM', label: 'Em viagem' },
  { value: 'REALIZADO', label: 'Realizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
] as const

export const TIPO_ATENDIMENTO_ORDER = ['CONSULTA', 'RETORNO', 'EXAME', 'CIRURGIA'] as const

export const TIPO_ATENDIMENTO_BAR_COLORS: Record<string, string> = {
  CONSULTA: 'bg-[var(--color-info)]',
  RETORNO: 'bg-[var(--color-primary)]',
  EXAME: 'bg-[var(--color-warning)]',
  CIRURGIA: 'bg-[var(--color-error)]',
}
