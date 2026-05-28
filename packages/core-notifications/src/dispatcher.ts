import { Prisma, type UserRole } from '@prisma/client'
import { getPrismaForTenant } from '@saude/core-db'

type TenantDb = Awaited<ReturnType<typeof getPrismaForTenant>>

type LembreteViagemDestinatariosRow = {
  solicitante_id: string
  aberto_por_id: string | null
  motorista_user_id: string | null
}

type LembretePrestacaoDestinatariosRow = {
  solicitante_id: string
  aberto_por_id: string | null
}

import { buildAnaliseTfdIniciadaMessage } from './templates/analise-tfd-iniciada'
import { buildComplementoTfdEnviadoMessage } from './templates/complemento-tfd-enviado'
import { buildComplementoTfdSolicitadoMessage } from './templates/complemento-tfd-solicitado'
import { buildSolicitacaoTfdAprovadaMessage } from './templates/solicitacao-tfd-aprovada'
import { buildSolicitacaoTfdEnviadaMessage } from './templates/solicitacao-tfd-enviada'
import { buildSolicitacaoTfdMuitoUrgenteMessage } from './templates/solicitacao-tfd-muito-urgente'
import { buildSolicitacaoTfdNegadaMessage } from './templates/solicitacao-tfd-negada'
import { buildAgendamentoTfdCriadoMessage } from './templates/agendamento-tfd-criado'
import { buildLembretePrestacao48hMessage } from './templates/lembrete-prestacao-48h'
import { buildLembreteViagem48hMessage } from './templates/lembrete-viagem-48h'
import { buildPrestacaoAprovadaMessage } from './templates/prestacao-aprovada'
import { buildPrestacaoEnviadaMessage } from './templates/prestacao-enviada'
import { buildPrestacaoRejeitadaMessage } from './templates/prestacao-rejeitada'
import { buildProcessoCanceladoMessage } from './templates/processo-cancelado'
import { buildSaldoBaixoMessage } from './templates/saldo-baixo'
import { buildRetornoRegistradoMessage } from './templates/retorno-registrado'
import { buildPendente30DiasMessage } from './templates/pendente-30-dias'
import { buildNotificacaoEmailFalhouMessage } from './templates/notificacao-email-falhou'
import { eventoSuportaEmail, eventoSuportaInApp } from './event-channels'

const RETRY_DELAY_MS = 15 * 60 * 1000
import { isSmtpTransportConfigured, sendEmail } from './email'
import { criarNotificacaoInApp } from './inapp'
import { getTenantEmailConfig } from './tenant-email-config'
import {
  NOTIFICATION_EVENTS,
  type DispararNotificacaoInput,
  type DispararNotificacaoResult,
  type LembretePrestacao48hNotificationContext,
  type LembreteViagem48hNotificationContext,
  type NotificationEvent,
  type NotificationMessage,
  type PrestacaoDecisaoNotificationContext,
  type PrestacaoEnviadaNotificationContext,
  type PrestacaoRejeitadaNotificationContext,
  type SaldoBaixoNotificationContext,
  type NotificacaoEmailFalhouNotificationContext,
  type SolicitacaoTfdNotificationContext,
  type SmtpConfig,
} from './types'

/** Gestor com acesso ao dashboard financeiro TFD (BUSINESS_RULES.md §1.14). */
const PERMISSAO_VER_DASHBOARD_TFD = 'saude.tfd.ver_dashboard'

type SolicitacaoCompatibleContext = Exclude<
  DispararNotificacaoInput['context'],
  NotificacaoEmailFalhouNotificationContext
>

function asSolicitacaoContext(context: SolicitacaoCompatibleContext): SolicitacaoTfdNotificationContext {
  return context as SolicitacaoTfdNotificationContext
}

function buildMessage(
  evento: NotificationEvent,
  input: DispararNotificacaoInput
): NotificationMessage {
  if (evento === NOTIFICATION_EVENTS.NOTIFICACAO_EMAIL_FALHOU) {
    return buildNotificacaoEmailFalhouMessage(
      input.context as NotificacaoEmailFalhouNotificationContext
    )
  }

  const solicitacaoContext = asSolicitacaoContext(input.context as SolicitacaoCompatibleContext)

  switch (evento) {
    case NOTIFICATION_EVENTS.SOLICITACAO_TFD_ENVIADA:
      return buildSolicitacaoTfdEnviadaMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.SOLICITACAO_TFD_MUITO_URGENTE:
      return buildSolicitacaoTfdMuitoUrgenteMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.ANALISE_TFD_INICIADA:
      return buildAnaliseTfdIniciadaMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.COMPLEMENTO_TFD_SOLICITADO:
      return buildComplementoTfdSolicitadoMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.COMPLEMENTO_TFD_ENVIADO:
      return buildComplementoTfdEnviadoMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.SOLICITACAO_TFD_APROVADA:
      return buildSolicitacaoTfdAprovadaMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.SOLICITACAO_TFD_NEGADA:
      return buildSolicitacaoTfdNegadaMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.AGENDAMENTO_TFD_CRIADO:
      return buildAgendamentoTfdCriadoMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.LEMBRETE_VIAGEM_48H:
      return buildLembreteViagem48hMessage(input.context as LembreteViagem48hNotificationContext)
    case NOTIFICATION_EVENTS.LEMBRETE_PRESTACAO_48H:
      return buildLembretePrestacao48hMessage(
        input.context as LembretePrestacao48hNotificationContext
      )
    case NOTIFICATION_EVENTS.PRESTACAO_ENVIADA:
      return buildPrestacaoEnviadaMessage(input.context as PrestacaoEnviadaNotificationContext)
    case NOTIFICATION_EVENTS.PRESTACAO_APROVADA:
      return buildPrestacaoAprovadaMessage(input.context as PrestacaoDecisaoNotificationContext)
    case NOTIFICATION_EVENTS.PRESTACAO_REJEITADA:
      return buildPrestacaoRejeitadaMessage(input.context as PrestacaoRejeitadaNotificationContext)
    case NOTIFICATION_EVENTS.PROCESSO_CANCELADO:
      return buildProcessoCanceladoMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.SALDO_BAIXO:
      return buildSaldoBaixoMessage(input.context as SaldoBaixoNotificationContext)
    case NOTIFICATION_EVENTS.RETORNO_REGISTRADO:
      return buildRetornoRegistradoMessage(solicitacaoContext)
    case NOTIFICATION_EVENTS.PENDENTE_30_DIAS:
      return buildPendente30DiasMessage(solicitacaoContext)
    default: {
      const _exhaustive: never = evento
      throw new Error(`Evento de notificação não suportado: ${String(_exhaustive)}`)
    }
  }
}

const ROLES_SETOR_MODULO: UserRole[] = ['GESTOR', 'SERVIDOR']
const ROLES_GESTOR_SETOR_MODULO: UserRole[] = ['GESTOR']

async function resolverUsuariosSetorModulo(
  db: TenantDb,
  tenantId: string,
  modulo: string,
  roles: UserRole[],
  excludeUserIds: string[]
): Promise<string[]> {
  const moduloResponsavel = await db.moduloSetorResponsavel.findFirst({
    where: {
      tenant_id: tenantId,
      modulo,
      ativo: true,
    },
    select: { setor_id: true },
  })

  if (!moduloResponsavel) {
    return []
  }

  const excludeSet = new Set(excludeUserIds)

  const vinculos = await db.servidorSetor.findMany({
    where: {
      tenant_id: tenantId,
      setor_id: moduloResponsavel.setor_id,
      ativo: true,
      user: {
        tenant_id: tenantId,
        active: true,
        deleted_at: null,
        role: { in: roles },
      },
    },
    select: { user_id: true },
  })

  const userIds = new Set<string>()
  for (const vinculo of vinculos) {
    if (!excludeSet.has(vinculo.user_id)) {
      userIds.add(vinculo.user_id)
    }
  }

  return [...userIds]
}

function userHasPermission(permissions: unknown, permissionKey: string): boolean {
  if (!permissions || typeof permissions !== 'object') {
    return false
  }

  return (permissions as Record<string, boolean>)[permissionKey] === true
}

async function resolverGestoresVerDashboardModulo(
  db: TenantDb,
  tenantId: string,
  modulo: string,
  permissionKey: string,
  excludeUserIds: string[]
): Promise<string[]> {
  const gestorIds = await resolverUsuariosSetorModulo(
    db,
    tenantId,
    modulo,
    ROLES_GESTOR_SETOR_MODULO,
    excludeUserIds
  )

  if (gestorIds.length === 0) {
    return []
  }

  const users = await db.user.findMany({
    where: {
      tenant_id: tenantId,
      id: { in: gestorIds },
      active: true,
      deleted_at: null,
    },
    select: { id: true, permissions: true },
  })

  const excludeSet = new Set(excludeUserIds)
  const destinatarios: string[] = []

  for (const user of users) {
    if (excludeSet.has(user.id)) {
      continue
    }

    if (userHasPermission(user.permissions, permissionKey)) {
      destinatarios.push(user.id)
    }
  }

  return destinatarios
}

async function resolverDestinatariosSetorModulo(
  db: TenantDb,
  tenantId: string,
  modulo: string,
  excludeUserIds: string[]
): Promise<string[]> {
  return resolverUsuariosSetorModulo(
    db,
    tenantId,
    modulo,
    ROLES_SETOR_MODULO,
    excludeUserIds
  )
}

async function resolverDestinatariosLembreteViagem48h(
  db: TenantDb,
  tenantId: string,
  viagemId: string,
  excludeUserIds: string[]
): Promise<string[]> {
  const rows = await db.$queryRaw<LembreteViagemDestinatariosRow[]>(
    Prisma.sql`
      SELECT
        s.solicitante_id,
        p.aberto_por_id,
        m.user_id AS motorista_user_id
      FROM saude_tfd.viagens v
      INNER JOIN saude_tfd.solicitacoes s
        ON s.id = v.solicitacao_id AND s.tenant_id = v.tenant_id
      INNER JOIN public.processos p
        ON p.id = s.processo_id AND p.tenant_id = v.tenant_id
      LEFT JOIN saude_tfd.motoristas m
        ON m.id = v.motorista_id AND m.tenant_id = v.tenant_id
      WHERE v.id = ${viagemId}::uuid
        AND v.tenant_id = ${tenantId}::uuid
      LIMIT 1
    `
  )

  const row = rows[0]
  if (!row) {
    return []
  }

  const excludeSet = new Set(excludeUserIds)
  const destinatarios = new Set<string>()

  const servidorResponsavelId = row.aberto_por_id ?? row.solicitante_id

  if (servidorResponsavelId && !excludeSet.has(servidorResponsavelId)) {
    destinatarios.add(servidorResponsavelId)
  }

  if (row.motorista_user_id && !excludeSet.has(row.motorista_user_id)) {
    destinatarios.add(row.motorista_user_id)
  }

  return [...destinatarios]
}

async function resolverDestinatariosLembretePrestacao48h(
  db: TenantDb,
  tenantId: string,
  prestacaoContaId: string,
  excludeUserIds: string[]
): Promise<string[]> {
  const rows = await db.$queryRaw<LembretePrestacaoDestinatariosRow[]>(
    Prisma.sql`
      SELECT
        s.solicitante_id,
        p.aberto_por_id
      FROM saude_tfd.prestacoes_conta pc
      INNER JOIN saude_tfd.viagens v
        ON v.id = pc.viagem_id AND v.tenant_id = pc.tenant_id
      INNER JOIN saude_tfd.solicitacoes s
        ON s.id = v.solicitacao_id AND s.tenant_id = pc.tenant_id
      INNER JOIN public.processos p
        ON p.id = s.processo_id AND p.tenant_id = pc.tenant_id
      WHERE pc.id = ${prestacaoContaId}::uuid
        AND pc.tenant_id = ${tenantId}::uuid
      LIMIT 1
    `
  )

  const row = rows[0]
  if (!row) {
    return []
  }

  const excludeSet = new Set(excludeUserIds)
  const servidorResponsavelId = row.aberto_por_id ?? row.solicitante_id

  if (!servidorResponsavelId || excludeSet.has(servidorResponsavelId)) {
    return []
  }

  return [servidorResponsavelId]
}

async function resolverDestinatarios(
  db: TenantDb,
  input: DispararNotificacaoInput
): Promise<string[]> {
  const excludeSet = new Set(input.excludeUserIds ?? [])

  if (input.evento === NOTIFICATION_EVENTS.LEMBRETE_VIAGEM_48H) {
    if (!input.viagemId) {
      return []
    }

    return resolverDestinatariosLembreteViagem48h(
      db,
      input.tenantId,
      input.viagemId,
      input.excludeUserIds ?? []
    )
  }

  if (input.evento === NOTIFICATION_EVENTS.LEMBRETE_PRESTACAO_48H) {
    if (!input.prestacaoContaId) {
      return []
    }

    return resolverDestinatariosLembretePrestacao48h(
      db,
      input.tenantId,
      input.prestacaoContaId,
      input.excludeUserIds ?? []
    )
  }

  if (input.evento === NOTIFICATION_EVENTS.PRESTACAO_ENVIADA) {
    return resolverUsuariosSetorModulo(
      db,
      input.tenantId,
      input.modulo,
      ROLES_GESTOR_SETOR_MODULO,
      input.excludeUserIds ?? []
    )
  }

  if (input.evento === NOTIFICATION_EVENTS.SALDO_BAIXO) {
    return resolverGestoresVerDashboardModulo(
      db,
      input.tenantId,
      input.modulo,
      PERMISSAO_VER_DASHBOARD_TFD,
      input.excludeUserIds ?? []
    )
  }

  if (input.evento === NOTIFICATION_EVENTS.NOTIFICACAO_EMAIL_FALHOU) {
    return resolverGestoresVerDashboardModulo(
      db,
      input.tenantId,
      input.modulo,
      PERMISSAO_VER_DASHBOARD_TFD,
      input.excludeUserIds ?? []
    )
  }

  if (input.recipientUserIds && input.recipientUserIds.length > 0) {
    const unique = new Set<string>()
    for (const userId of input.recipientUserIds) {
      if (!excludeSet.has(userId)) {
        unique.add(userId)
      }
    }
    return [...unique]
  }

  return resolverDestinatariosSetorModulo(
    db,
    input.tenantId,
    input.modulo,
    input.excludeUserIds ?? []
  )
}

function escapeHtmlForEmail(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />')
}

function buildDispararNotificacaoResult(
  inAppRequired: boolean,
  inApp: boolean,
  emailRequired: boolean,
  email: boolean,
  emailChannelFailed: boolean
): DispararNotificacaoResult {
  const ok =
    (!inAppRequired || inApp) && (!emailRequired || !emailChannelFailed)

  return { inApp, email, ok }
}

function failureResult(): DispararNotificacaoResult {
  return { inApp: false, email: false, ok: false }
}

async function enviarNotificacoesEmail(
  db: TenantDb,
  input: DispararNotificacaoInput,
  destinatarios: string[],
  titulo: string,
  mensagem: string,
  smtpConfig: SmtpConfig | null,
  from: string
): Promise<{ email: boolean; emailChannelFailed: boolean }> {
  const users = await db.user.findMany({
    where: {
      tenant_id: input.tenantId,
      id: { in: destinatarios },
      active: true,
      deleted_at: null,
    },
    select: { id: true, email: true },
  })

  const destinatariosComEmail = users.filter(
    (user) => typeof user.email === 'string' && user.email.trim() !== ''
  )

  if (destinatariosComEmail.length === 0) {
    return { email: true, emailChannelFailed: false }
  }

  const tituloNotificacao = titulo.slice(0, 200)
  const htmlBody = escapeHtmlForEmail(mensagem)
  const smtpDisponivel = isSmtpTransportConfigured(smtpConfig)
  let tentativasEnvio = 0
  let enviosComSucesso = 0
  let emailChannelFailed = false

  for (const destinatario of destinatariosComEmail) {
    const endereco = destinatario.email.trim()

    const notificacao = await db.notificacao.create({
      data: {
        tenant_id: input.tenantId,
        user_id: destinatario.id,
        processo_id: input.processoId ?? null,
        canal: 'EMAIL',
        status: 'PENDENTE',
        evento: input.evento,
        titulo: tituloNotificacao,
        corpo: mensagem,
      },
      select: { id: true },
    })

    if (!smtpDisponivel) {
      continue
    }

    tentativasEnvio += 1

    try {
      await sendEmail(
        {
          from,
          to: [endereco],
          subject: tituloNotificacao,
          textBody: mensagem,
          htmlBody,
        },
        smtpConfig
      )

      await db.notificacao.update({
        where: { id: notificacao.id },
        data: {
          status: 'ENVIADO',
          enviado_at: new Date(),
        },
      })

      enviosComSucesso += 1
    } catch (error) {
      emailChannelFailed = true

      await db.notificacao.update({
        where: { id: notificacao.id },
        data: {
          status: 'FALHOU',
          tentativas: { increment: 1 },
          proxima_tentativa_at: new Date(Date.now() + RETRY_DELAY_MS),
        },
      })

      console.error('[dispararNotificacao] Falha no envio de e-mail.', {
        tenantId: input.tenantId,
        evento: input.evento,
        notificacaoId: notificacao.id,
        message: error instanceof Error ? error.message : 'Erro desconhecido no envio SMTP.',
      })
    }
  }

  if (!smtpDisponivel) {
    return { email: false, emailChannelFailed: false }
  }

  return {
    email: tentativasEnvio > 0 && enviosComSucesso === tentativasEnvio,
    emailChannelFailed,
  }
}

/**
 * Dispara notificações in-app e e-mail conforme `event-channels.ts`.
 */
export async function dispararNotificacao(
  input: DispararNotificacaoInput
): Promise<DispararNotificacaoResult> {
  const inAppRequired = eventoSuportaInApp(input.evento)
  const emailRequired = eventoSuportaEmail(input.evento)

  try {
    const db = await getPrismaForTenant(input.tenantId)
    const { titulo, mensagem } = buildMessage(input.evento, input)
    const destinatarios = await resolverDestinatarios(db, input)

    if (destinatarios.length === 0) {
      return failureResult()
    }

    let inApp = false

    if (inAppRequired) {
      inApp = await criarNotificacaoInApp(db, {
        tenantId: input.tenantId,
        userIds: destinatarios,
        processoId: input.processoId,
        titulo,
        corpo: mensagem,
      })
    }

    let email = true
    let emailChannelFailed = false

    if (emailRequired) {
      const tenantEmailConfig = await getTenantEmailConfig(input.tenantId, db)

      if (!tenantEmailConfig.enabled) {
        email = true
      } else if (!tenantEmailConfig.from) {
        email = false
        emailChannelFailed = true
      } else {
        const resultadoEmail = await enviarNotificacoesEmail(
          db,
          input,
          destinatarios,
          titulo,
          mensagem,
          tenantEmailConfig.smtp,
          tenantEmailConfig.from
        )
        email = resultadoEmail.email
        emailChannelFailed = resultadoEmail.emailChannelFailed
      }
    }

    return buildDispararNotificacaoResult(
      inAppRequired,
      inApp,
      emailRequired,
      email,
      emailChannelFailed
    )
  } catch (error) {
    console.error('[dispararNotificacao] Falha ao disparar notificação:', {
      tenantId: input.tenantId,
      evento: input.evento,
      modulo: input.modulo,
      processoId: input.processoId ?? null,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return failureResult()
  }
}
