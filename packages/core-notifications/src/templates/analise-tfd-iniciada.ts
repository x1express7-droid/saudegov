import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildAnaliseTfdIniciadaMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Análise iniciada — ${context.protocolo}`,
    mensagem:
      `A solicitação TFD ${context.protocolo} entrou em análise. ` +
      `Especialidade: ${context.especialidade}. ` +
      `Urgência: ${context.urgencia}.`,
  }
}
