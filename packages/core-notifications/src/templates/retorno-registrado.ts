import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildRetornoRegistradoMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Retorno registrado — ${context.protocolo}`,
    mensagem:
      `O retorno da viagem TFD foi registrado. ` +
      `Protocolo: ${context.protocolo}. ` +
      `Especialidade: ${context.especialidade}.`,
  }
}
