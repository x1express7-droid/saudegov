import type { NotificacaoEmailFalhouNotificationContext, NotificationMessage } from '../types'

export function buildNotificacaoEmailFalhouMessage(
  context: NotificacaoEmailFalhouNotificationContext
): NotificationMessage {
  const protocoloLabel = context.protocolo ?? 'processo não informado'

  return {
    titulo: `Falha no envio de e-mail — ${protocoloLabel}`.slice(0, 200),
    mensagem:
      `Não foi possível entregar a notificação por e-mail após 3 tentativas. ` +
      `Evento de origem: ${context.eventoOrigem}. ` +
      `Destinatário previsto: ${context.destinatarioResumo}. ` +
      `Verifique a configuração SMTP do município.`,
  }
}
