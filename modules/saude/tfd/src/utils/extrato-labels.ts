export const MOVIMENTACAO_TIPO_LABELS: Record<string, string> = {
  CREDITO: 'Crédito',
  RESERVA: 'Reserva',
  CONSUMO: 'Consumo',
  LIBERACAO: 'Liberação',
  ESTORNO: 'Estorno',
}

export function labelTipoMovimentacao(tipo: string): string {
  return MOVIMENTACAO_TIPO_LABELS[tipo] ?? tipo
}

export function formatExtratoOrigemLabel(origem: {
  tipo: string
  descricaoResumo: string
}): string {
  return `${labelTipoMovimentacao(origem.tipo)} — ${origem.descricaoResumo}`
}
