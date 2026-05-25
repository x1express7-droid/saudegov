import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  List,
  PlusCircle,
  Settings,
  UserSearch,
} from 'lucide-react'

/** Chaves em `tenant.modules.saude` — alinhado a `docs/MUNICIPAL_MAP.md`. */
export type SaudeModuleToggleKey =
  | 'tfd'
  | 'regul'
  | 'ubs'
  | 'farma'
  | 'visa'
  | 'viepi'
  | 'sment'
  | 'vacin'

export interface SaudeNavChildConfig {
  label: string
  href: string
  icon: LucideIcon
}

export interface SaudeModuleNavConfig {
  moduleKey: SaudeModuleToggleKey
  label: string
  basePath: string
  icon: LucideIcon
  children: SaudeNavChildConfig[]
}

/**
 * Catálogo de navegação do Sistema de Saúde (menu lateral).
 * Inclua aqui apenas módulos em desenvolvimento ou já disponíveis no painel.
 * Demais chaves em `SaudeModuleToggleKey` permanecem no Painel Dev / tenant até a Fase correspondente.
 */
export const SAUDE_MODULES_NAV: readonly SaudeModuleNavConfig[] = [
  {
    moduleKey: 'tfd',
    label: 'TFD',
    basePath: '/saude/tfd',
    icon: ClipboardList,
    children: [
      { label: 'Dashboard', href: '/saude/tfd/dashboard', icon: LayoutDashboard },
      { label: 'Nova Solicitação', href: '/saude/tfd/nova', icon: PlusCircle },
      { label: 'Fila de Solicitações', href: '/saude/tfd', icon: List },
      { label: 'Agendamentos', href: '/saude/tfd/agendamentos', icon: CalendarDays },
      { label: 'Pacientes', href: '/saude/tfd/pacientes', icon: UserSearch },
    ],
  },
] as const

export const SAUDE_SYSTEM_DASHBOARD = {
  label: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard,
} as const

export const SAUDE_CONFIG_NAV = {
  label: 'Configurações',
  href: '/saude/tfd/configuracoes/especialidades',
  icon: Settings,
} as const
