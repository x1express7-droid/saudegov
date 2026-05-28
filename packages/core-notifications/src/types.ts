/** Eventos de notificação implementados (expandir por sprint). */
export const NOTIFICATION_EVENTS = {
  SOLICITACAO_TFD_ENVIADA: 'SOLICITACAO_TFD_ENVIADA',
  SOLICITACAO_TFD_MUITO_URGENTE: 'SOLICITACAO_TFD_MUITO_URGENTE',
  ANALISE_TFD_INICIADA: 'ANALISE_TFD_INICIADA',
  COMPLEMENTO_TFD_SOLICITADO: 'COMPLEMENTO_TFD_SOLICITADO',
  COMPLEMENTO_TFD_ENVIADO: 'COMPLEMENTO_TFD_ENVIADO',
  SOLICITACAO_TFD_APROVADA: 'SOLICITACAO_TFD_APROVADA',
  SOLICITACAO_TFD_NEGADA: 'SOLICITACAO_TFD_NEGADA',
  AGENDAMENTO_TFD_CRIADO: 'AGENDAMENTO_TFD_CRIADO',
  LEMBRETE_VIAGEM_48H: 'LEMBRETE_VIAGEM_48H',
  LEMBRETE_PRESTACAO_48H: 'LEMBRETE_PRESTACAO_48H',
  PRESTACAO_ENVIADA: 'PRESTACAO_ENVIADA',
  PRESTACAO_APROVADA: 'PRESTACAO_APROVADA',
  PRESTACAO_REJEITADA: 'PRESTACAO_REJEITADA',
  PROCESSO_CANCELADO: 'PROCESSO_CANCELADO',
  SALDO_BAIXO: 'SALDO_BAIXO',
  RETORNO_REGISTRADO: 'RETORNO_REGISTRADO',
  PENDENTE_30_DIAS: 'PENDENTE_30_DIAS',
  NOTIFICACAO_EMAIL_FALHOU: 'NOTIFICACAO_EMAIL_FALHOU',
} as const

export type NotificationEvent =
  (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS]

/** Canais suportados pelo pacote (alinhado ao enum Prisma `notificacao_canal`). */
export const NOTIFICATION_CHANNELS = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
} as const

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS]

/** SMTP custom do tenant (`smtp_custom_enabled`); senha já decriptada em memória. */
export interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
  secure: boolean
}

/** Configuração de e-mail do tenant para envio de notificações. */
export interface TenantEmailConfig {
  enabled: boolean
  from: string
  smtp: SmtpConfig | null
}

export interface SendEmailParams {
  from: string
  to: string[]
  subject: string
  textBody: string
  htmlBody: string
}

/** Contexto permitido para notificações TFD — sem dados sensíveis (LGPD Art. 11). */
export interface SolicitacaoTfdNotificationContext {
  protocolo: string
  especialidade: string
  urgencia: string
}

/** Contexto do lembrete 48h antes da viagem — sem CID, CPF ou CNS. */
export interface LembreteViagem48hNotificationContext {
  protocolo: string
  pacienteNome: string
  dataViagem: string
  horaSaida: string | null
  motoristaNome: string
}

/** Contexto do lembrete 48h antes do prazo da prestação — sem CID, CPF ou CNS. */
export interface LembretePrestacao48hNotificationContext {
  protocolo: string
  prazoEnvioAt: string
  sequenciaViagem: number
}

/** Contexto de prestação enviada para análise do gestor — sem dados sensíveis. */
export interface PrestacaoEnviadaNotificationContext {
  protocolo: string
  especialidade: string
  sequenciaViagem: number
  valorTotalFormatado: string
}

/** Contexto de prestação aprovada — notificação ao servidor. */
export interface PrestacaoDecisaoNotificationContext {
  protocolo: string
  especialidade: string
  sequenciaViagem: number
  valorTotalFormatado: string
}

/** Contexto de prestação rejeitada — notificação ao servidor. */
export interface PrestacaoRejeitadaNotificationContext {
  protocolo: string
  especialidade: string
  sequenciaViagem: number
  observacoesGestor: string
}

/** Contexto de saldo abaixo de 20% — sem valores monetários ou dados sensíveis. */
export interface SaldoBaixoNotificationContext {
  nomeSaldo: string
  percentualDisponivel: number
}

/** Contexto de falha definitiva no envio de e-mail — sem dados sensíveis nem corpo do e-mail original. */
export interface NotificacaoEmailFalhouNotificationContext {
  protocolo: string | null
  eventoOrigem: string
  destinatarioResumo: string
}

export interface NotificationMessage {
  titulo: string
  mensagem: string
}

/** Resultado de `dispararNotificacao` (Sprint 2.4 — canais in-app e e-mail). */
export interface DispararNotificacaoResult {
  inApp: boolean
  email: boolean
  ok: boolean
}

export interface DispararNotificacaoInput {
  tenantId: string
  evento: NotificationEvent
  /** Chave do módulo em `modulo_setor_responsavel` (ex.: `saude.tfd`). */
  modulo: string
  processoId?: string
  /** Obrigatório para `LEMBRETE_VIAGEM_48H` — resolve solicitante e motorista da viagem. */
  viagemId?: string
  /** Obrigatório para `LEMBRETE_PRESTACAO_48H` — resolve servidor responsável pela solicitação. */
  prestacaoContaId?: string
  context:
    | SolicitacaoTfdNotificationContext
    | LembreteViagem48hNotificationContext
    | LembretePrestacao48hNotificationContext
    | PrestacaoEnviadaNotificationContext
    | PrestacaoDecisaoNotificationContext
    | PrestacaoRejeitadaNotificationContext
    | SaldoBaixoNotificationContext
    | NotificacaoEmailFalhouNotificationContext
  /** Usuários a omitir (ex.: quem disparou a ação). */
  excludeUserIds?: string[]
  /** Destinatários explícitos; se omitido, resolve conforme o evento. */
  recipientUserIds?: string[]
}
