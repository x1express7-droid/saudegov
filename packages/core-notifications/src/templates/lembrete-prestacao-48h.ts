import type { LembretePrestacao48hNotificationContext, NotificationMessage } from '../types'

export function buildLembretePrestacao48hMessage(
  context: LembretePrestacao48hNotificationContext
): NotificationMessage {
  return {
    titulo: `Lembrete de prestação de contas TFD — ${context.protocolo}`,
    mensagem:
      `A prestação de contas da viagem ${context.sequenciaViagem} vence em ${context.prazoEnvioAt}. ` +
      `Envie os comprovantes e despesas antes do prazo. Protocolo: ${context.protocolo}.`,
  }
}
