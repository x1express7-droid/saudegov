import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildProcessoCanceladoMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Processo cancelado — ${context.protocolo}`,
    mensagem:
      `A solicitação TFD ${context.protocolo} foi cancelada pelo gestor. ` +
      `Consulte o processo para ver o motivo registrado.`,
  }
}
