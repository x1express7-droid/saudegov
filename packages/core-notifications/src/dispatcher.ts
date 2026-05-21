import type { PrismaClient, UserRole } from '@prisma/client'
import { getPrismaForTenant } from '@saude/core-db'

import { buildSolicitacaoTfdEnviadaMessage } from './templates/solicitacao-tfd-enviada'
import { buildSolicitacaoTfdMuitoUrgenteMessage } from './templates/solicitacao-tfd-muito-urgente'
import {
  NOTIFICATION_EVENTS,
  type DispararNotificacaoInput,
  type NotificationEvent,
  type NotificationMessage,
} from './types'

function buildMessage(
  evento: NotificationEvent,
  input: DispararNotificacaoInput
): NotificationMessage {
  switch (evento) {
    case NOTIFICATION_EVENTS.SOLICITACAO_TFD_ENVIADA:
      return buildSolicitacaoTfdEnviadaMessage(input.context)
    case NOTIFICATION_EVENTS.SOLICITACAO_TFD_MUITO_URGENTE:
      return buildSolicitacaoTfdMuitoUrgenteMessage(input.context)
    default: {
      const _exhaustive: never = evento
      throw new Error(`Evento de notificação não suportado: ${String(_exhaustive)}`)
    }
  }
}

const ROLES_SETOR_MODULO: UserRole[] = ['GESTOR', 'SERVIDOR']

async function resolverDestinatariosSetorModulo(
  db: PrismaClient,
  tenantId: string,
  modulo: string,
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
        role: { in: ROLES_SETOR_MODULO },
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

/**
 * Dispara notificações in-app para os destinatários do evento.
 * Best-effort: falhas são logadas e não propagadas (após commit da transação principal).
 */
export async function dispararNotificacao(input: DispararNotificacaoInput): Promise<void> {
  try {
    const db = await getPrismaForTenant(input.tenantId)
    const { titulo, mensagem } = buildMessage(input.evento, input)
    const destinatarios = await resolverDestinatariosSetorModulo(
      db,
      input.tenantId,
      input.modulo,
      input.excludeUserIds ?? []
    )

    if (destinatarios.length === 0) {
      return
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
  } catch (error) {
    console.error('[dispararNotificacao] Falha ao disparar notificação:', {
      tenantId: input.tenantId,
      evento: input.evento,
      modulo: input.modulo,
      processoId: input.processoId ?? null,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
  }
}
