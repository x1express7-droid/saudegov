import type { BrazilTimezone } from '@saude/validators'
import { BRAZIL_TIMEZONES } from '@saude/validators'
import { DEFAULT_BRAZIL_TIMEZONE } from '../constants/brazil-timezones'

export type TenantSettings = Record<string, unknown>

export interface DadosMunicipioFormValues {
  cnpj: string
  timezone: BrazilTimezone
  municipioOrigemCidade: string
  municipioOrigemEstado: string
}

export interface NotificacoesEmailFormValues {
  emailNotificationsEnabled: boolean
  notificationEmail: string
}

export interface SmtpConfigFormValues {
  smtpCustomEnabled: boolean
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpFrom: string
  smtpSecure: boolean
  /** Indica se já existe senha em `smtp_password_enc` — nunca enviar a senha ao cliente. */
  smtpPasswordConfigured: boolean
}

export interface CadsusConfigFormValues {
  cadsusEnabled: boolean
  /** Apenas sufixo (últimos 4 caracteres) para exibição — nunca o token completo. */
  tokenSuffix: string | null
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

function isBrazilTimezone(value: string): value is BrazilTimezone {
  return (BRAZIL_TIMEZONES as readonly string[]).includes(value)
}

export function parseSettingsJson(value: unknown): TenantSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  return { ...(value as Record<string, unknown>) }
}

export function settingsToFormValues(settings: TenantSettings): DadosMunicipioFormValues {
  const cnpjRaw = pickString(settings, 'cnpj')
  const timezoneRaw = pickString(settings, 'timezone')

  return {
    cnpj: cnpjRaw,
    timezone: isBrazilTimezone(timezoneRaw) ? timezoneRaw : DEFAULT_BRAZIL_TIMEZONE,
    municipioOrigemCidade: pickString(
      settings,
      'municipio_origem_cidade',
      'municipioOrigemCidade'
    ),
    municipioOrigemEstado: pickString(
      settings,
      'municipio_origem_estado',
      'municipioOrigemEstado'
    ),
  }
}

export function settingsToNotificacoesEmailFormValues(
  settings: TenantSettings
): NotificacoesEmailFormValues {
  return {
    emailNotificationsEnabled: pickBooleanDefault(settings, 'email_notifications_enabled', true),
    notificationEmail: pickString(settings, 'notification_email', 'notificationEmail'),
  }
}

export function settingsToSmtpFormValues(settings: TenantSettings): SmtpConfigFormValues {
  return {
    smtpCustomEnabled: pickBoolean(settings, 'smtp_custom_enabled'),
    smtpHost: pickString(settings, 'smtp_host'),
    smtpPort: pickPort(settings, 'smtp_port', 587),
    smtpUser: pickString(settings, 'smtp_user'),
    smtpFrom: pickString(settings, 'smtp_from'),
    smtpSecure: pickBooleanDefault(settings, 'smtp_secure', true),
    smtpPasswordConfigured: pickString(settings, 'smtp_password_enc').length > 0,
  }
}

export function mergeSettingsDadosMunicipio(
  existing: TenantSettings,
  dados: {
    cnpj?: string
    timezone: BrazilTimezone
    municipioOrigemCidade?: string
    municipioOrigemEstado?: string
  }
): TenantSettings {
  const merged: TenantSettings = { ...existing, timezone: dados.timezone }

  if (dados.cnpj) {
    merged.cnpj = dados.cnpj
  } else {
    delete merged.cnpj
  }

  if (dados.municipioOrigemCidade && dados.municipioOrigemEstado) {
    merged.municipio_origem_cidade = dados.municipioOrigemCidade
    merged.municipio_origem_estado = dados.municipioOrigemEstado
  } else {
    delete merged.municipio_origem_cidade
    delete merged.municipio_origem_estado
    delete merged.municipioOrigemCidade
    delete merged.municipioOrigemEstado
  }

  return merged
}

export function mergeSettingsNotificacoesEmail(
  existing: TenantSettings,
  dados: {
    emailNotificationsEnabled: boolean
    notificationEmail?: string
  }
): TenantSettings {
  const merged: TenantSettings = {
    ...existing,
    email_notifications_enabled: dados.emailNotificationsEnabled,
  }

  if (dados.notificationEmail) {
    merged.notification_email = dados.notificationEmail
  } else {
    delete merged.notification_email
  }

  delete merged.notificationEmail

  return merged
}

export function mergeSettingsSmtp(
  existing: TenantSettings,
  dados:
    | { smtpCustomEnabled: false }
    | {
        smtpCustomEnabled: true
        smtpHost: string
        smtpPort: number
        smtpUser: string
        smtpFrom: string
        smtpSecure: boolean
        smtpPasswordEnc?: string
      }
): TenantSettings {
  if (!dados.smtpCustomEnabled) {
    return {
      ...existing,
      smtp_custom_enabled: false,
    }
  }

  const merged: TenantSettings = {
    ...existing,
    smtp_custom_enabled: true,
    smtp_host: dados.smtpHost,
    smtp_port: dados.smtpPort,
    smtp_user: dados.smtpUser,
    smtp_from: dados.smtpFrom,
    smtp_secure: dados.smtpSecure,
  }

  if (dados.smtpPasswordEnc) {
    merged.smtp_password_enc = dados.smtpPasswordEnc
  }

  return merged
}

function pickBoolean(settings: TenantSettings, key: string): boolean {
  return settings[key] === true
}

function pickBooleanDefault(
  settings: TenantSettings,
  key: string,
  defaultValue: boolean
): boolean {
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

export function settingsToCadsusFormValues(settings: TenantSettings): CadsusConfigFormValues {
  const token = pickString(settings, 'cadsus_token')
  return {
    cadsusEnabled: pickBoolean(settings, 'cadsus_enabled'),
    tokenSuffix: token.length >= 4 ? token.slice(-4) : token.length > 0 ? '****' : null,
  }
}

export function mergeSettingsCadsus(
  existing: TenantSettings,
  dados: {
    cadsusEnabled: boolean
    cadsusToken?: string
  }
): TenantSettings {
  const merged: TenantSettings = {
    ...existing,
    cadsus_enabled: dados.cadsusEnabled,
  }

  const token = dados.cadsusToken?.trim()
  if (token) {
    merged.cadsus_token = token
  }

  return merged
}

export function cadsusConfigForAudit(settings: TenantSettings): {
  cadsus_enabled: boolean
  cadsus_token_configured: boolean
} {
  return {
    cadsus_enabled: pickBoolean(settings, 'cadsus_enabled'),
    cadsus_token_configured: pickString(settings, 'cadsus_token').length > 0,
  }
}

export function dadosMunicipioForAudit(settings: TenantSettings): {
  cnpj: string | null
  timezone: string
  municipioOrigemCidade: string | null
  municipioOrigemEstado: string | null
} {
  const form = settingsToFormValues(settings)
  return {
    cnpj: form.cnpj || null,
    timezone: form.timezone,
    municipioOrigemCidade: form.municipioOrigemCidade || null,
    municipioOrigemEstado: form.municipioOrigemEstado || null,
  }
}

export function notificacoesEmailConfigForAudit(settings: TenantSettings): {
  email_notifications_enabled: boolean
  notification_email: string | null
} {
  const form = settingsToNotificacoesEmailFormValues(settings)
  return {
    email_notifications_enabled: form.emailNotificationsEnabled,
    notification_email: form.notificationEmail || null,
  }
}

export function smtpConfigForAudit(settings: TenantSettings): {
  smtp_custom_enabled: boolean
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_from: string | null
  smtp_secure: boolean | null
  smtp_password_configured: boolean
} {
  const form = settingsToSmtpFormValues(settings)
  return {
    smtp_custom_enabled: form.smtpCustomEnabled,
    smtp_host: form.smtpHost || null,
    smtp_port: form.smtpCustomEnabled ? form.smtpPort : null,
    smtp_user: form.smtpUser || null,
    smtp_from: form.smtpFrom || null,
    smtp_secure: form.smtpCustomEnabled ? form.smtpSecure : null,
    smtp_password_configured: form.smtpPasswordConfigured,
  }
}
