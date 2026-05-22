import type { PrestacaoEnviadaNotificationContext, NotificationMessage } from '../types'

export function buildPrestacaoEnviadaMessage(
  context: PrestacaoEnviadaNotificationContext
): NotificationMessage {
  return {
    titulo: `Prestação de contas enviada — ${context.protocolo}`,
    mensagem:
      `A prestação de contas da viagem ${context.sequenciaViagem} foi enviada para análise ` +
      `(total ${context.valorTotalFormatado}). Especialidade: ${context.especialidade}. ` +
      `Protocolo: ${context.protocolo}.`,
  }
}
