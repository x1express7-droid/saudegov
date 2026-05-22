import type { PrestacaoRejeitadaNotificationContext, NotificationMessage } from '../types'

export function buildPrestacaoRejeitadaMessage(
  context: PrestacaoRejeitadaNotificationContext
): NotificationMessage {
  return {
    titulo: `Prestação de contas rejeitada — ${context.protocolo}`,
    mensagem:
      `A prestação de contas da viagem ${context.sequenciaViagem} foi rejeitada e precisa de correção. ` +
      `Observação do gestor: ${context.observacoesGestor}. Protocolo: ${context.protocolo}.`,
  }
}
