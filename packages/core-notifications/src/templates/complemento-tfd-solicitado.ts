import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildComplementoTfdSolicitadoMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Complemento solicitado — ${context.protocolo}`,
    mensagem:
      `Foi solicitado complemento de informações na solicitação TFD ${context.protocolo}. ` +
      `Acesse o processo para enviar a resposta.`,
  }
}
