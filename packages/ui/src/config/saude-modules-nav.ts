import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Brain,
  CalendarDays,
  ClipboardList,
  GitBranch,
  Home,
  LayoutDashboard,
  List,
  Pill,
  PlusCircle,
  Settings,
  ShieldCheck,
  Syringe,
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
 * Catálogo de navegação do Sistema de Saúde.
 * Para adicionar um módulo: inclua a chave em `SaudeModuleToggleKey` e um item neste array.
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
  {
    moduleKey: 'regul',
    label: 'Regulação',
    basePath: '/saude/regul',
    icon: GitBranch,
    children: [],
  },
  {
    moduleKey: 'ubs',
    label: 'UBS / Atenção Básica',
    basePath: '/saude/ubs',
    icon: Home,
    children: [],
  },
  {
    moduleKey: 'farma',
    label: 'Farmácia Municipal',
    basePath: '/saude/farma',
    icon: Pill,
    children: [],
  },
  {
    moduleKey: 'visa',
    label: 'Vigilância Sanitária',
    basePath: '/saude/visa',
    icon: ShieldCheck,
    children: [],
  },
  {
    moduleKey: 'viepi',
    label: 'Vigilância Epidemiológica',
    basePath: '/saude/viepi',
    icon: Activity,
    children: [],
  },
  {
    moduleKey: 'sment',
    label: 'Saúde Mental',
    basePath: '/saude/sment',
    icon: Brain,
    children: [],
  },
  {
    moduleKey: 'vacin',
    label: 'Vacinação',
    basePath: '/saude/vacin',
    icon: Syringe,
    children: [],
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
