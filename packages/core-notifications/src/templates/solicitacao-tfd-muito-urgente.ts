import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildSolicitacaoTfdMuitoUrgenteMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `URGENTE — TFD ${context.protocolo}`,
    mensagem:
      `Solicitação TFD com urgência MUITO_URGENTE requer atenção imediata. ` +
      `Protocolo: ${context.protocolo}. ` +
      `Especialidade: ${context.especialidade}. ` +
      `Urgência: ${context.urgencia}.`,
  }
}
