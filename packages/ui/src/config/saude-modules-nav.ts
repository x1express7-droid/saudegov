/** Identificadores serializáveis de ícones Lucide (resolvidos no Client Component). */
export type SaudeNavIconName =
  | 'BarChart3'
  | 'Bus'
  | 'CalendarDays'
  | 'ClipboardList'
  | 'FileText'
  | 'LayoutDashboard'
  | 'List'
  | 'PlusCircle'
  | 'Receipt'
  | 'Settings'
  | 'UserSearch'
  | 'Wallet'

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
  icon: SaudeNavIconName
}

/** Rótulo da seção Financeiro no accordion TFD. */
export const TFD_FINANCEIRO_SECTION_LABEL = 'Financeiro' as const

/**
 * Catálogo do submenu Financeiro (ícones).
 * Permissões e filtragem: `getTfdFinanceiroVisibleNav` em `@saude/mod-saude-tfd`.
 */
export const TFD_FINANCEIRO_NAV_CATALOG = [
  {
    label: 'Saldos',
    href: '/saude/tfd/configuracoes/saldos',
    icon: 'Wallet',
  },
  {
    label: 'Prestações de contas',
    href: '/saude/tfd/prestacoes',
    icon: 'Receipt',
  },
  {
    label: 'Relatórios',
    href: '/saude/tfd/dashboard',
    icon: 'BarChart3',
  },
] as const satisfies ReadonlyArray<SaudeNavChildConfig>

const TFD_FINANCEIRO_ICON_BY_HREF: Record<string, SaudeNavIconName> = Object.fromEntries(
  TFD_FINANCEIRO_NAV_CATALOG.map((item) => [item.href, item.icon])
) as Record<string, SaudeNavIconName>

/** Anexa identificadores de ícone aos itens financeiros filtrados no servidor. */
export function attachTfdFinanceiroNavIcons(
  items: ReadonlyArray<{ label: string; href: string }>
): SaudeNavChildConfig[] {
  return items.map((item) => ({
    label: item.label,
    href: item.href,
    icon: TFD_FINANCEIRO_ICON_BY_HREF[item.href] ?? 'Wallet',
  }))
}

export interface SaudeModuleNavConfig {
  moduleKey: SaudeModuleToggleKey
  label: string
  basePath: string
  icon: SaudeNavIconName
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
    icon: 'ClipboardList',
    children: [
      { label: 'Dashboard', href: '/saude/tfd/dashboard', icon: 'LayoutDashboard' },
      { label: 'Nova Solicitação', href: '/saude/tfd/nova', icon: 'PlusCircle' },
      { label: 'Solicitações', href: '/saude/tfd/solicitacoes', icon: 'FileText' },
      { label: 'Processos TFD', href: '/saude/tfd/processos', icon: 'List' },
      { label: 'Agendamentos', href: '/saude/tfd/agendamentos', icon: 'CalendarDays' },
      { label: 'Viagens', href: '/saude/tfd/viagens', icon: 'Bus' },
      { label: 'Pacientes', href: '/saude/tfd/pacientes', icon: 'UserSearch' },
    ],
  },
] as const

export const SAUDE_SYSTEM_DASHBOARD = {
  label: 'Dashboard',
  href: '/dashboard',
  icon: 'LayoutDashboard',
} as const satisfies { label: string; href: string; icon: SaudeNavIconName }

export const SAUDE_CONFIG_NAV = {
  label: 'Configurações',
  /** Hub de configuração municipal (ADMIN) — abas em /configuracoes/*. */
  basePath: '/configuracoes',
  icon: 'Settings',
} as const satisfies { label: string; basePath: string; icon: SaudeNavIconName }
