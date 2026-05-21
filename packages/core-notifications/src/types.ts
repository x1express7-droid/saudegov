/** Eventos de notificação implementados (expandir por sprint). */
export const NOTIFICATION_EVENTS = {
  SOLICITACAO_TFD_ENVIADA: 'SOLICITACAO_TFD_ENVIADA',
  SOLICITACAO_TFD_MUITO_URGENTE: 'SOLICITACAO_TFD_MUITO_URGENTE',
  ANALISE_TFD_INICIADA: 'ANALISE_TFD_INICIADA',
  COMPLEMENTO_TFD_SOLICITADO: 'COMPLEMENTO_TFD_SOLICITADO',
  COMPLEMENTO_TFD_ENVIADO: 'COMPLEMENTO_TFD_ENVIADO',
  SOLICITACAO_TFD_APROVADA: 'SOLICITACAO_TFD_APROVADA',
  SOLICITACAO_TFD_NEGADA: 'SOLICITACAO_TFD_NEGADA',
} as const

export type NotificationEvent =
  (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS]

/** Canais suportados pelo pacote (Sprint 1.4: apenas in-app). */
export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
} as const

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS]

/** Contexto permitido para notificações TFD — sem dados sensíveis (LGPD Art. 11). */
export interface SolicitacaoTfdNotificationContext {
  protocolo: string
  especialidade: string
  urgencia: string
}

export interface NotificationMessage {
  titulo: string
  mensagem: string
}

export interface DispararNotificacaoInput {
  tenantId: string
  evento: NotificationEvent
  /** Chave do módulo em `modulo_setor_responsavel` (ex.: `saude.tfd`). */
  modulo: string
  processoId?: string
  context: SolicitacaoTfdNotificationContext
  /** Usuários a omitir (ex.: quem disparou a ação). */
  excludeUserIds?: string[]
  /** Destinatários explícitos; se omitido, resolve o setor do módulo. */
  recipientUserIds?: string[]
}
