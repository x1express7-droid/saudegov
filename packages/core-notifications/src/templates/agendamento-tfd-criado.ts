import type { NotificationMessage, SolicitacaoTfdNotificationContext } from '../types'

export function buildAgendamentoTfdCriadoMessage(
  context: SolicitacaoTfdNotificationContext
): NotificationMessage {
  return {
    titulo: `Viagem agendada — ${context.protocolo}`,
    mensagem:
      `Foi registrado um agendamento de viagem TFD para o protocolo ${context.protocolo}. ` +
      `Especialidade: ${context.especialidade}.`,
  }
}
