import type { PrestacaoDecisaoNotificationContext, NotificationMessage } from '../types'

export function buildPrestacaoAprovadaMessage(
  context: PrestacaoDecisaoNotificationContext
): NotificationMessage {
  return {
    titulo: `Prestação de contas aprovada — ${context.protocolo}`,
    mensagem:
      `A prestação de contas da viagem ${context.sequenciaViagem} foi aprovada ` +
      `(total ${context.valorTotalFormatado}). O processo TFD foi concluído. ` +
      `Protocolo: ${context.protocolo}.`,
  }
}
