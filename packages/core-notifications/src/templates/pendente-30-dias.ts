import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildPendente30DiasMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Complemento pendente há 30 dias — ${context.protocolo}`,
    mensagem:
      `A solicitação TFD aguarda complemento há 30 dias sem retorno do solicitante. ` +
      `Protocolo: ${context.protocolo}. ` +
      `Especialidade: ${context.especialidade}.`,
  }
}
