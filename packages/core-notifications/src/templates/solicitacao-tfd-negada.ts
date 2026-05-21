import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildSolicitacaoTfdNegadaMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Solicitação negada — ${context.protocolo}`,
    mensagem:
      `Sua solicitação TFD ${context.protocolo} foi negada. ` +
      `Consulte o processo para ver a fundamentação da decisão.`,
  }
}
