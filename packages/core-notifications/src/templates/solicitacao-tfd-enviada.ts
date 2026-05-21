import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildSolicitacaoTfdEnviadaMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Nova solicitação TFD — ${context.protocolo}`,
    mensagem:
      `Nova solicitação de TFD na fila de regulação. ` +
      `Protocolo: ${context.protocolo}. ` +
      `Especialidade: ${context.especialidade}. ` +
      `Urgência: ${context.urgencia}.`,
  }
}
