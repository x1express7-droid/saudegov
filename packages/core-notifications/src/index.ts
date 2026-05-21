export {
  NOTIFICATION_EVENTS,
  NOTIFICATION_CHANNELS,
  type NotificationEvent,
  type NotificationChannel,
  type SolicitacaoTfdNotificationContext,
  type NotificationMessage,
  type DispararNotificacaoInput,
} from './types'

export { dispararNotificacao } from './dispatcher'

export { buildSolicitacaoTfdEnviadaMessage } from './templates/solicitacao-tfd-enviada'
export { buildSolicitacaoTfdMuitoUrgenteMessage } from './templates/solicitacao-tfd-muito-urgente'
