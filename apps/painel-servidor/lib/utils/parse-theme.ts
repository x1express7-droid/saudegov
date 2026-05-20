import type { TenantTheme } from '../theme-to-css-vars'

export interface TemaFormValues {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string
  municipalityName: string
}

const DEFAULT_PRIMARY = '#1a5fa8'
const DEFAULT_SECONDARY = '#64748b'
const DEFAULT_ACCENT = '#d97706'

function pickString(theme: TenantTheme, ...keys: string[]): string {
  for (const key of keys) {
    const value = theme[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }
  return ''
}

function isHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function parseThemeJson(value: unknown): TenantTheme {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  const result: TenantTheme = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'string') {
      result[key] = val
    }
  }
  return result
}

export function themeToFormValues(theme: TenantTheme): TemaFormValues {
  const primary = pickString(theme, 'primaryColor', 'primary_color')
  const secondary = pickString(theme, 'secondaryColor', 'secondary_color')
  const accent = pickString(theme, 'accentColor', 'accent_color')
  const logo = pickString(theme, 'logoUrl', 'logo_url')

  return {
    primaryColor: isHex(primary) ? primary : DEFAULT_PRIMARY,
    secondaryColor: isHex(secondary) ? secondary : DEFAULT_SECONDARY,
    accentColor: isHex(accent) ? accent : DEFAULT_ACCENT,
    logoUrl: logo,
    municipalityName: pickString(theme, 'municipalityName', 'municipality_name'),
  }
}

export function mergeThemeCores(
  existing: TenantTheme,
  cores: { primaryColor: string; secondaryColor: string; accentColor: string }
): TenantTheme {
  return {
    ...existing,
    primaryColor: cores.primaryColor,
    secondaryColor: cores.secondaryColor,
    accentColor: cores.accentColor,
  }
}

export function mergeThemeLogo(existing: TenantTheme, logoUrl: string): TenantTheme {
  return {
    ...existing,
    logoUrl,
    logo_url: logoUrl,
  }
}
