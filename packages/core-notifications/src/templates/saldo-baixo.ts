import type { NotificationMessage, SaldoBaixoNotificationContext } from '../types'

function formatPercentual(value: number): string {
  const clamped = Math.max(0, value)
  return clamped.toFixed(2).replace('.', ',')
}

export function buildSaldoBaixoMessage(
  context: SaldoBaixoNotificationContext
): NotificationMessage {
  const percentual = formatPercentual(context.percentualDisponivel)

  return {
    titulo: `Saldo financeiro baixo — ${context.nomeSaldo}`,
    mensagem:
      `O saldo "${context.nomeSaldo}" está com ${percentual}% do valor total ainda disponível ` +
      `(abaixo de 20%). Consulte o painel financeiro TFD.`,
  }
}
