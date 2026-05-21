import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildComplementoTfdEnviadoMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Complemento enviado — ${context.protocolo}`,
    mensagem:
      `O solicitante enviou complemento na solicitação TFD ${context.protocolo}. ` +
      `O processo voltou para análise.`,
  }
}
