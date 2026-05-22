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
import {
  NOTIFICATION_EVENTS,
  type DispararNotificacaoInput,
  type LembretePrestacao48hNotificationContext,
  type LembreteViagem48hNotificationContext,
  type NotificationEvent,
  type NotificationMessage,
  type PrestacaoDecisaoNotificationContext,
  type PrestacaoEnviadaNotificationContext,
  type PrestacaoRejeitadaNotificationContext,
  type SolicitacaoTfdNotificationContext,
} from './types'

function asSolicitacaoContext(
  context:
    | SolicitacaoTfdNotificationContext
    | LembreteViagem48hNotificationContext
    | LembretePrestacao48hNotificationContext
    | PrestacaoEnviadaNotificationContext
    | PrestacaoDecisaoNotificationContext
    | PrestacaoRejeitadaNotificationContext
): SolicitacaoTfdNotificationContext {
  return context as SolicitacaoTfdNotificationContext
}

function buildMessage(
  evento: NotificationEvent,
  input: DispararNotificacaoInput
): NotificationMessage {
  const solicitacaoContext = asSolicitacaoContext(input.context)

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

/**
 * Dispara notificações in-app para os destinatários do evento.
 * Retorna `true` se ao menos uma notificação foi criada; `false` se sem destinatários ou erro.
 */
export async function dispararNotificacao(input: DispararNotificacaoInput): Promise<boolean> {
  try {
    const db = await getPrismaForTenant(input.tenantId)
    const { titulo, mensagem } = buildMessage(input.evento, input)
    const destinatarios = await resolverDestinatarios(db, input)

    if (destinatarios.length === 0) {
      return false
    }

    const enviadoAt = new Date()

    await db.notificacao.createMany({
      data: destinatarios.map((userId) => ({
        tenant_id: input.tenantId,
        user_id: userId,
        processo_id: input.processoId ?? null,
        canal: 'IN_APP' as const,
        status: 'ENVIADO' as const,
        titulo: titulo.slice(0, 200),
        corpo: mensagem,
        enviado_at: enviadoAt,
      })),
    })

    return true
  } catch (error) {
    console.error('[dispararNotificacao] Falha ao disparar notificação:', {
      tenantId: input.tenantId,
      evento: input.evento,
      modulo: input.modulo,
      processoId: input.processoId ?? null,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return false
  }
}
