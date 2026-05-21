import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildSolicitacaoTfdAprovadaMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Solicitação aprovada — ${context.protocolo}`,
    mensagem:
      `Sua solicitação TFD ${context.protocolo} foi aprovada. ` +
      `Consulte o processo para ver a fundamentação e os próximos passos.`,
  }
}
