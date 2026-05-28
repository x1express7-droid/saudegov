import type { UserRole } from '@prisma/client'
import { getPrismaAdmin } from '@saude/core-db'

import { dispararNotificacao } from '../dispatcher'
import { isSmtpTransportConfigured, sendEmail } from '../email'
import { getTenantEmailConfig } from '../tenant-email-config'
import { NOTIFICATION_EVENTS, type SmtpConfig, type TenantEmailConfig } from '../types'

const MODULO_TFD = 'saude.tfd'
const RETRY_DELAY_MS = 15 * 60 * 1000
const MAX_TENTATIVAS_EMAIL = 3

export interface ProcessarFilaEmailResult {
  processadas: number
  enviadas: number
  falhas: number
  falhasDefinitivas: number
  gestoresNotificados: number
}

type NotificacaoFilaRow = {
  id: string
  tenant_id: string
  user_id: string | null
  processo_id: string | null
  evento: string | null
  titulo: string
  corpo: string
  tentativas: number
  user: { email: string } | null
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

function mapRoleToDestinatarioResumo(role: UserRole): string {
  if (role === 'GESTOR') {
    return 'gestor do setor TFD'
  }

  if (role === 'SERVIDOR') {
    return 'servidor responsável'
  }

  return 'usuário do sistema'
}

async function buildContextoNotificacaoEmailFalhou(
  notificacao: Pick<NotificacaoFilaRow, 'tenant_id' | 'processo_id' | 'evento' | 'user_id'>
) {
  const db = getPrismaAdmin()

  let protocolo: string | null = null

  if (notificacao.processo_id) {
    const processo = await db.processo.findFirst({
      where: {
        id: notificacao.processo_id,
        tenant_id: notificacao.tenant_id,
      },
      select: { protocolo: true },
    })

    protocolo = processo?.protocolo ?? null
  }

  let destinatarioResumo = 'destinatário da notificação'

  if (notificacao.user_id) {
    const user = await db.user.findFirst({
      where: {
        id: notificacao.user_id,
        tenant_id: notificacao.tenant_id,
      },
      select: { role: true },
    })

    if (user) {
      destinatarioResumo = mapRoleToDestinatarioResumo(user.role)
    }
  }

  return {
    protocolo,
    eventoOrigem: notificacao.evento ?? 'notificação TFD',
    destinatarioResumo,
  }
}

async function notificarGestorFalhaEmailDefinitiva(
  notificacao: Pick<
    NotificacaoFilaRow,
    'tenant_id' | 'processo_id' | 'evento' | 'user_id'
  >
): Promise<boolean> {
  const context = await buildContextoNotificacaoEmailFalhou(notificacao)

  const resultado = await dispararNotificacao({
    tenantId: notificacao.tenant_id,
    evento: NOTIFICATION_EVENTS.NOTIFICACAO_EMAIL_FALHOU,
    modulo: MODULO_TFD,
    processoId: notificacao.processo_id ?? undefined,
    context,
  })

  return resultado.inApp
}

async function processarNotificacaoEmail(
  notificacao: NotificacaoFilaRow,
  tenantConfig: TenantEmailConfig,
  smtpConfig: SmtpConfig | null,
  resumo: ProcessarFilaEmailResult
): Promise<void> {
  const db = getPrismaAdmin()
  resumo.processadas += 1

  if (!tenantConfig.enabled) {
    return
  }

  const endereco = notificacao.user?.email?.trim() ?? ''
  if (!endereco || !notificacao.user_id) {
    return
  }

  if (!tenantConfig.from) {
    await registrarFalhaRetry(notificacao, resumo)
    return
  }

  if (!isSmtpTransportConfigured(smtpConfig)) {
    await db.notificacao.update({
      where: { id: notificacao.id },
      data: {
        proxima_tentativa_at: new Date(Date.now() + RETRY_DELAY_MS),
      },
    })
    return
  }

  const titulo = notificacao.titulo
  const htmlBody = escapeHtmlForEmail(notificacao.corpo)

  try {
    await sendEmail(
      {
        from: tenantConfig.from,
        to: [endereco],
        subject: titulo,
        textBody: notificacao.corpo,
        htmlBody,
      },
      smtpConfig
    )

    await db.notificacao.update({
      where: { id: notificacao.id },
      data: {
        status: 'ENVIADO',
        enviado_at: new Date(),
        proxima_tentativa_at: null,
      },
    })

    resumo.enviadas += 1
  } catch (error) {
    await registrarFalhaRetry(notificacao, resumo)

    console.error('[processarFilaEmail] Falha no reenvio de e-mail.', {
      tenantId: notificacao.tenant_id,
      notificacaoId: notificacao.id,
      evento: notificacao.evento ?? null,
      message: error instanceof Error ? error.message : 'Erro desconhecido no envio SMTP.',
    })
  }
}

async function registrarFalhaRetry(
  notificacao: NotificacaoFilaRow,
  resumo: ProcessarFilaEmailResult
): Promise<void> {
  const db = getPrismaAdmin()
  const novasTentativas = notificacao.tentativas + 1

  if (novasTentativas >= MAX_TENTATIVAS_EMAIL) {
    await db.notificacao.update({
      where: { id: notificacao.id },
      data: {
        status: 'FALHOU',
        tentativas: novasTentativas,
        proxima_tentativa_at: null,
      },
    })

    resumo.falhasDefinitivas += 1

    const gestorNotificado = await notificarGestorFalhaEmailDefinitiva(notificacao)

    if (gestorNotificado) {
      resumo.gestoresNotificados += 1
    }

    return
  }

  await db.notificacao.update({
    where: { id: notificacao.id },
    data: {
      status: 'FALHOU',
      tentativas: novasTentativas,
      proxima_tentativa_at: new Date(Date.now() + RETRY_DELAY_MS),
    },
  })

  resumo.falhas += 1
}

/**
 * Job cross-tenant: reenvio de notificações e-mail pendentes ou com falha.
 * Usa getPrismaAdmin (sem RLS) — invocação exclusiva via cron da plataforma.
 */
export async function processarFilaEmail(): Promise<ProcessarFilaEmailResult> {
  const db = getPrismaAdmin()
  const agora = new Date()

  const candidatas = await db.notificacao.findMany({
    where: {
      canal: 'EMAIL',
      status: { in: ['PENDENTE', 'FALHOU'] },
      tentativas: { lt: MAX_TENTATIVAS_EMAIL },
      OR: [{ proxima_tentativa_at: null }, { proxima_tentativa_at: { lte: agora } }],
    },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      tenant_id: true,
      user_id: true,
      processo_id: true,
      evento: true,
      titulo: true,
      corpo: true,
      tentativas: true,
      user: {
        select: { email: true },
      },
    },
  })

  const resumo: ProcessarFilaEmailResult = {
    processadas: 0,
    enviadas: 0,
    falhas: 0,
    falhasDefinitivas: 0,
    gestoresNotificados: 0,
  }

  const configPorTenant = new Map<string, TenantEmailConfig>()

  for (const notificacao of candidatas as NotificacaoFilaRow[]) {
    let tenantConfig = configPorTenant.get(notificacao.tenant_id)

    if (!tenantConfig) {
      tenantConfig = await getTenantEmailConfig(notificacao.tenant_id, db)
      configPorTenant.set(notificacao.tenant_id, tenantConfig)
    }

    await processarNotificacaoEmail(
      notificacao,
      tenantConfig,
      tenantConfig.smtp,
      resumo
    )
  }

  console.info('[processarFilaEmail] Resumo:', {
    processadas: resumo.processadas,
    enviadas: resumo.enviadas,
    falhas: resumo.falhas,
    falhasDefinitivas: resumo.falhasDefinitivas,
    gestoresNotificados: resumo.gestoresNotificados,
  })

  return resumo
}
