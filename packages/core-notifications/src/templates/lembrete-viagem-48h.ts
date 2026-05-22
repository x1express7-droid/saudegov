import type { LembreteViagem48hNotificationContext, NotificationMessage } from '../types'

export function buildLembreteViagem48hMessage(
  context: LembreteViagem48hNotificationContext
): NotificationMessage {
  const horario =
    context.horaSaida !== null
      ? ` às ${context.horaSaida}`
      : ''

  return {
    titulo: `Lembrete de viagem TFD — ${context.protocolo}`,
    mensagem:
      `A viagem TFD do paciente ${context.pacienteNome} está agendada para ${context.dataViagem}${horario}. ` +
      `Motorista: ${context.motoristaNome}. Protocolo: ${context.protocolo}.`,
  }
}
