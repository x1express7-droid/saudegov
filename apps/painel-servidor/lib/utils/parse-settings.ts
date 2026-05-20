import type { BrazilTimezone } from '@saude/validators'
import { BRAZIL_TIMEZONES } from '@saude/validators'
import { DEFAULT_BRAZIL_TIMEZONE } from '../constants/brazil-timezones'

export type TenantSettings = Record<string, unknown>

export interface DadosMunicipioFormValues {
  cnpj: string
  timezone: BrazilTimezone
  notificationEmail: string
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
  const emailRaw = pickString(settings, 'notification_email', 'notificationEmail')

  return {
    cnpj: cnpjRaw,
    timezone: isBrazilTimezone(timezoneRaw) ? timezoneRaw : DEFAULT_BRAZIL_TIMEZONE,
    notificationEmail: emailRaw,
  }
}

export function mergeSettingsDadosMunicipio(
  existing: TenantSettings,
  dados: {
    cnpj?: string
    timezone: BrazilTimezone
    notificationEmail?: string
  }
): TenantSettings {
  const merged: TenantSettings = { ...existing, timezone: dados.timezone }

  if (dados.cnpj) {
    merged.cnpj = dados.cnpj
  } else {
    delete merged.cnpj
  }

  if (dados.notificationEmail) {
    merged.notification_email = dados.notificationEmail
  } else {
    delete merged.notification_email
  }

  delete merged.notificationEmail

  return merged
}

function pickBoolean(settings: TenantSettings, key: string): boolean {
  return settings[key] === true
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
  notificationEmail: string | null
} {
  const form = settingsToFormValues(settings)
  return {
    cnpj: form.cnpj || null,
    timezone: form.timezone,
    notificationEmail: form.notificationEmail || null,
  }
}
