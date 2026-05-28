export {
  NOTIFICATION_EVENTS,
  NOTIFICATION_CHANNELS,
  type NotificationEvent,
  type NotificationChannel,
  type SolicitacaoTfdNotificationContext,
  type LembreteViagem48hNotificationContext,
  type LembretePrestacao48hNotificationContext,
  type PrestacaoEnviadaNotificationContext,
  type PrestacaoDecisaoNotificationContext,
  type PrestacaoRejeitadaNotificationContext,
  type SaldoBaixoNotificationContext,
  type NotificacaoEmailFalhouNotificationContext,
  type NotificationMessage,
  type DispararNotificacaoInput,
  type DispararNotificacaoResult,
  type SmtpConfig,
  type TenantEmailConfig,
  type SendEmailParams,
} from './types'

export { getTenantEmailConfig } from './tenant-email-config'
export { sendEmail, isSmtpTransportConfigured } from './email'
export { criarNotificacaoInApp, type CriarNotificacaoInAppInput } from './inapp'

export {
  EVENT_CHANNELS,
  getCanaisObrigatorios,
  eventoSuportaEmail,
  eventoSuportaInApp,
  type EventChannelsConfig,
} from './event-channels'

export { dispararNotificacao } from './dispatcher'

export { processarFilaEmail, type ProcessarFilaEmailResult } from './jobs/processar-fila-email'

export { buildSolicitacaoTfdEnviadaMessage } from './templates/solicitacao-tfd-enviada'
export { buildSolicitacaoTfdMuitoUrgenteMessage } from './templates/solicitacao-tfd-muito-urgente'
export { buildSolicitacaoTfdAprovadaMessage } from './templates/solicitacao-tfd-aprovada'
export { buildSolicitacaoTfdNegadaMessage } from './templates/solicitacao-tfd-negada'
export { buildLembreteViagem48hMessage } from './templates/lembrete-viagem-48h'
export { buildLembretePrestacao48hMessage } from './templates/lembrete-prestacao-48h'
export { buildPrestacaoEnviadaMessage } from './templates/prestacao-enviada'
export { buildPrestacaoAprovadaMessage } from './templates/prestacao-aprovada'
export { buildPrestacaoRejeitadaMessage } from './templates/prestacao-rejeitada'
export { buildProcessoCanceladoMessage } from './templates/processo-cancelado'
export { buildSaldoBaixoMessage } from './templates/saldo-baixo'
export { buildNotificacaoEmailFalhouMessage } from './templates/notificacao-email-falhou'
