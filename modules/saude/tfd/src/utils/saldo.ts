/**
 * Agregados de reservas e consumo para cálculo de saldo disponível.
 * Queries devem somar reservas com status ATIVA e movimentações tipo CONSUMO.
 * @see docs/BUSINESS_RULES.md §1.8
 */
export interface CalcSaldoDisponivelInput {
  valorTotal: number
  /** SUM(reservas_saldo.valor_estimado WHERE status = 'ATIVA') */
  valorReservado: number
  /** SUM(movimentacoes_saldo.valor WHERE tipo = 'CONSUMO') */
  valorConsumido: number
}

export interface CalcSaldoDisponivelResult {
  valorDisponivel: number
  /** Percentual do valor total ainda disponível (0–100+; pode ser negativo se excedido). */
  percentualDisponivel: number
  /** true quando disponível < 20% do valor_total (BUSINESS_RULES.md §1.8). */
  alertaBaixo: boolean
}

const ALERTA_SALDO_BAIXO_FRACAO = 0.2

function roundPercentual(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Calcula saldo disponível, percentual e flag de alerta visual.
 * Função pura — sem I/O.
 *
 * Disponível = valor_total - reservado (ATIVA) - consumido (CONSUMO)
 */
export function calcSaldoDisponivel(input: CalcSaldoDisponivelInput): CalcSaldoDisponivelResult {
  const { valorTotal, valorReservado, valorConsumido } = input

  const valorDisponivel = valorTotal - valorReservado - valorConsumido

  const percentualDisponivel =
    valorTotal > 0 ? roundPercentual((valorDisponivel / valorTotal) * 100) : 0

  const limiteAlerta = valorTotal * ALERTA_SALDO_BAIXO_FRACAO
  const alertaBaixo = valorDisponivel < limiteAlerta

  return {
    valorDisponivel,
    percentualDisponivel,
    alertaBaixo,
  }
}
