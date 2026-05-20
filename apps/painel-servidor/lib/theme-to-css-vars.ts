import type { CSSProperties } from 'react'

/** Tema do tenant (JSONB em `tenants.theme`), chaves em camelCase. */
export type TenantTheme = Record<string, string | undefined>

const DEFAULT_PRIMARY = '#1a5fa8'
const DEFAULT_PRIMARY_HOVER = '#155090'
const DEFAULT_PRIMARY_LIGHT = '#e8f0fb'
const DEFAULT_SECONDARY = '#64748b'
const DEFAULT_ACCENT = '#d97706'
const DEFAULT_HEADER_TEXT = '#ffffff'

export interface TenantThemeCssVars {
  '--color-primary': string
  '--color-primary-hover': string
  '--color-primary-light': string
  '--color-header-bg': string
  '--color-header-text': string
  '--color-secondary': string
  '--color-accent': string
}

function isHexColor(value: string | undefined): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = parseInt(hex.slice(1), 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (channel: number) => Math.min(255, Math.max(0, Math.round(channel)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Escurece a cor (~12%) para hover quando não definida no banco. */
function darkenHex(hex: string, ratio = 0.12): string {
  const { r, g, b } = hexToRgb(hex)
  const factor = 1 - ratio
  return rgbToHex(r * factor, g * factor, b * factor)
}

/** Clareia misturando com branco (~92%) para primary-light quando não definida no banco. */
function lightenHex(hex: string, ratio = 0.92): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio)
}

function resolveTenantThemeCssVars(theme: TenantTheme): TenantThemeCssVars {
  const primary = isHexColor(theme.primaryColor) ? theme.primaryColor : DEFAULT_PRIMARY

  const primaryHover = isHexColor(theme.primaryHoverColor)
    ? theme.primaryHoverColor
    : primary === DEFAULT_PRIMARY
      ? DEFAULT_PRIMARY_HOVER
      : darkenHex(primary)

  const primaryLight = isHexColor(theme.primaryLightColor)
    ? theme.primaryLightColor
    : primary === DEFAULT_PRIMARY
      ? DEFAULT_PRIMARY_LIGHT
      : lightenHex(primary)

  const headerBg = isHexColor(theme.headerBgColor)
    ? theme.headerBgColor
    : isHexColor(theme.header_bg_color)
      ? theme.header_bg_color
      : primary

  const headerText = isHexColor(theme.headerTextColor)
    ? theme.headerTextColor
    : isHexColor(theme.header_text_color)
      ? theme.header_text_color
      : DEFAULT_HEADER_TEXT

  const secondary = isHexColor(theme.secondaryColor)
    ? theme.secondaryColor
    : isHexColor(theme.secondary_color)
      ? theme.secondary_color
      : DEFAULT_SECONDARY

  const accent = isHexColor(theme.accentColor)
    ? theme.accentColor
    : isHexColor(theme.accent_color)
      ? theme.accent_color
      : DEFAULT_ACCENT

  return {
    '--color-primary': primary,
    '--color-primary-hover': primaryHover,
    '--color-primary-light': primaryLight,
    '--color-header-bg': headerBg,
    '--color-header-text': headerText,
    '--color-secondary': secondary,
    '--color-accent': accent,
  }
}

/**
 * Retorna as 5 variáveis de tema como string CSS inline
 * (ex.: `--color-primary: #1a5fa8; --color-primary-hover: ...`).
 */
export function themeToCssVars(theme: TenantTheme): string {
  const vars = resolveTenantThemeCssVars(theme)
  return (Object.entries(vars) as [keyof TenantThemeCssVars, string][])
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ')
}

/** Objeto para a prop `style` do React (ex.: elemento `<html>`). */
export function themeToCssVarsStyle(theme: TenantTheme): CSSProperties {
  return resolveTenantThemeCssVars(theme) as CSSProperties
}
