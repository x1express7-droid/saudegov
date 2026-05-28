import { decryptTenantSecret } from '@saude/core-auth'
import type { getPrismaForTenant } from '@saude/core-db'

import type { SmtpConfig, TenantEmailConfig } from './types'

type TenantDb = Awaited<ReturnType<typeof getPrismaForTenant>>

type TenantSettings = Record<string, unknown>

const DEFAULT_SMTP_PORT = 587

function parseSettingsJson(value: unknown): TenantSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  return { ...(value as Record<string, unknown>) }
}

function pickString(settings: TenantSettings, ...keys: string[]): string {
  for (const key of keys) {
    const value = settings[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return ''
}

function pickBoolean(settings: TenantSettings, key: string, defaultValue: boolean): boolean {
  const value = settings[key]

  if (typeof value === 'boolean') {
    return value
  }

  return defaultValue
}

function pickPort(settings: TenantSettings, key: string, defaultValue: number): number {
  const value = settings[key]

  if (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 65535) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value.trim(), 10)
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
      return parsed
    }
  }

  return defaultValue
}

function resolveFromAddress(settings: TenantSettings): string {
  const smtpCustomEnabled = pickBoolean(settings, 'smtp_custom_enabled', false)
  const smtpFrom = pickString(settings, 'smtp_from')
  const notificationEmail = pickString(settings, 'notification_email', 'notificationEmail')

  if (smtpCustomEnabled && smtpFrom) {
    return smtpFrom
  }

  return notificationEmail
}

function resolveCustomSmtp(settings: TenantSettings): SmtpConfig | null {
  const smtpCustomEnabled = pickBoolean(settings, 'smtp_custom_enabled', false)

  if (!smtpCustomEnabled) {
    return null
  }

  const host = pickString(settings, 'smtp_host')
  if (!host) {
    return null
  }

  const passwordEnc = pickString(settings, 'smtp_password_enc')
  let password = ''

  if (passwordEnc) {
    password = decryptTenantSecret(passwordEnc)
  }

  return {
    host,
    port: pickPort(settings, 'smtp_port', DEFAULT_SMTP_PORT),
    user: pickString(settings, 'smtp_user'),
    password,
    secure: pickBoolean(settings, 'smtp_secure', true),
  }
}

/**
 * Lê configuração de e-mail do tenant a partir de `tenants.settings`.
 * Quando `smtp` é `null`, o caller deve usar `SMTP_PLATFORM_*`.
 */
export async function getTenantEmailConfig(
  tenantId: string,
  db: TenantDb
): Promise<TenantEmailConfig> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })

  if (!tenant) {
    throw new Error('Tenant não encontrado.')
  }

  const settings = parseSettingsJson(tenant.settings)

  return {
    enabled: pickBoolean(settings, 'email_notifications_enabled', true),
    from: resolveFromAddress(settings),
    smtp: resolveCustomSmtp(settings),
  }
}
