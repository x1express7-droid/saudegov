'use client'

import {
  Building2,
  ChevronDown,
  Landmark,
  Network,
  Palette,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  SAUDE_CONFIG_NAV,
  SAUDE_MODULES_NAV,
  SAUDE_SYSTEM_DASHBOARD,
  type SaudeModuleNavConfig,
  type SaudeModuleToggleKey,
} from '../config/saude-modules-nav'
import { cn } from '../utils/cn'
import { focusRingClassName } from '../utils/field-control'
import { Badge } from './badge'

export interface SidebarNavChildItem {
  label: string
  href: string
  icon?: ReactNode
  separatorBefore?: boolean
}

export interface SidebarNavItem {
  label: string
  href: string
  icon: ReactNode
  children?: SidebarNavChildItem[]
}

export interface SidebarProps {
  modules: Record<string, Record<string, boolean>>
  pathname: string
  className?: string
  collapsed?: boolean
  onNavigate?: () => void
  showAdminNav?: boolean
  /** Exibe Configurações do Sistema de Saúde (ADMIN/GESTOR). */
  showTfdConfigNav?: boolean
  systemName?: string
}

const ADMIN_NAV_ITEMS = [
  { label: 'Organograma', href: '/configuracoes/organograma', icon: Building2 },
  { label: 'Responsáveis', href: '/configuracoes/responsaveis', icon: Network },
  { label: 'Servidores', href: '/configuracoes/servidores', icon: Users },
  { label: 'Tema', href: '/configuracoes/tema', icon: Palette },
  { label: 'Município', href: '/configuracoes/municipio', icon: Landmark },
] as const

function isModuleActive(modules: Record<string, Record<string, boolean>>, key: SaudeModuleToggleKey): boolean {
  return Boolean(modules.saude?.[key])
}

function resolveActiveModuleKey(pathname: string): SaudeModuleToggleKey | null {
  for (const mod of SAUDE_MODULES_NAV) {
    if (pathname === mod.basePath || pathname.startsWith(`${mod.basePath}/`)) {
      return mod.moduleKey
    }
  }
  return null
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === SAUDE_SYSTEM_DASHBOARD.href) {
    return pathname === '/dashboard' || pathname === '/'
  }
  if (href === '/saude/tfd') {
    return pathname === '/saude/tfd'
  }
  if (href === '/saude/tfd/dashboard') {
    return pathname === '/saude/tfd/dashboard'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface SaudeModuleAccordionProps {
  config: SaudeModuleNavConfig
  active: boolean
  expanded: boolean
  pathname: string
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
}

function SaudeModuleAccordion({
  config,
  active,
  expanded,
  pathname,
  collapsed,
  onToggle,
  onNavigate,
}: SaudeModuleAccordionProps) {
  const ModuleIcon = config.icon
  const hasChildren = config.children.length > 0
  const sectionActive = resolveActiveModuleKey(pathname) === config.moduleKey

  if (!active) {
    return (
      <div
        className={cn(
          'flex min-h-[44px] items-center gap-[var(--space-2)] rounded-[var(--radius)] px-[var(--space-2)] py-[var(--space-2)] opacity-50',
          collapsed && 'justify-center px-0'
        )}
        aria-disabled="true"
        title={collapsed ? config.label : undefined}
      >
        <ModuleIcon className="size-[18px] shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-muted)]">
              {config.label}
            </span>
            <Badge variant="gray" size="sm" className="shrink-0">
              Em breve
            </Badge>
          </>
        ) : (
          <span className="sr-only">
            {config.label} — em breve
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        title={collapsed ? config.label : undefined}
        className={cn(
          'flex min-h-[44px] w-full items-center gap-[var(--space-2)] rounded-[var(--radius)] px-[var(--space-2)] py-[var(--space-2)] text-left transition-colors',
          focusRingClassName,
          collapsed && 'justify-center px-0',
          sectionActive
            ? 'bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))] text-[var(--color-primary)]'
            : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]'
        )}
      >
        <ModuleIcon
          className={cn(
            'size-[18px] shrink-0',
            sectionActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
          )}
          aria-hidden="true"
        />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 text-[length:var(--text-sm)] font-semibold">{config.label}</span>
            <Badge variant="green" size="sm" className="shrink-0">
              Ativo
            </Badge>
            {hasChildren ? (
              <ChevronDown
                className={cn(
                  'size-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200',
                  expanded && 'rotate-180'
                )}
                aria-hidden="true"
              />
            ) : null}
          </>
        ) : (
          <span className="sr-only">{config.label}</span>
        )}
      </button>

      {expanded && hasChildren && !collapsed ? (
        <ul
          className="flex flex-col gap-[var(--space-1)] border-l border-[var(--color-border)] pl-[var(--space-2)] ml-[var(--space-4)]"
          aria-label={`${config.label} — navegação`}
        >
          {config.children.map((child) => {
            const ChildIcon = child.icon
            const childActive = isActivePath(pathname, child.href)

            return (
              <li key={child.href}>
                <a
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={childActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[36px] items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] px-[var(--space-2)] text-[length:var(--text-xs)] transition-colors',
                    focusRingClassName,
                    childActive
                      ? 'bg-[var(--color-primary-light)] font-bold text-[var(--color-primary)]'
                      : 'font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                  )}
                >
                  <ChildIcon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{child.label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export function Sidebar({
  modules,
  pathname,
  className,
  collapsed = false,
  onNavigate,
  showAdminNav = false,
  showTfdConfigNav = false,
  systemName = 'Sistema de Saúde',
}: SidebarProps) {
  const activeModuleFromPath = resolveActiveModuleKey(pathname)
  const [expandedModuleKey, setExpandedModuleKey] = useState<SaudeModuleToggleKey | null>(
    activeModuleFromPath
  )

  useEffect(() => {
    if (activeModuleFromPath && isModuleActive(modules, activeModuleFromPath)) {
      setExpandedModuleKey(activeModuleFromPath)
    }
  }, [activeModuleFromPath, modules])

  const handleToggleModule = useCallback((key: SaudeModuleToggleKey) => {
    setExpandedModuleKey((prev) => (prev === key ? null : key))
  }, [])

  const dashboardActive = isActivePath(pathname, SAUDE_SYSTEM_DASHBOARD.href)
  const DashboardIcon = SAUDE_SYSTEM_DASHBOARD.icon
  const ConfigIcon = SAUDE_CONFIG_NAV.icon
  const configActive = pathname.startsWith('/saude/tfd/configuracoes')

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] py-[var(--space-4)]',
        collapsed ? 'w-16' : 'w-[260px]',
        className
      )}
    >
      <div
        className={cn(
          'mb-[var(--space-4)] px-[var(--space-3)]',
          collapsed && 'flex justify-center px-0'
        )}
      >
        {!collapsed ? (
          <span className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            {systemName}
          </span>
        ) : (
          <span className="sr-only">{systemName}</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[var(--space-2)]">
        <ul className="flex flex-col gap-[var(--space-1)]">
          <li>
            <a
              href={SAUDE_SYSTEM_DASHBOARD.href}
              onClick={onNavigate}
              title={collapsed ? SAUDE_SYSTEM_DASHBOARD.label : undefined}
              aria-current={dashboardActive ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] items-center gap-[var(--space-3)] rounded-[var(--radius)] px-[var(--space-3)] text-[length:var(--text-sm)] transition-colors',
                focusRingClassName,
                collapsed && 'mx-auto min-w-[44px] justify-center px-0',
                dashboardActive
                  ? 'bg-[var(--color-primary-light)] font-bold text-[var(--color-primary)]'
                  : 'font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
              )}
            >
              <DashboardIcon className="size-5 shrink-0" aria-hidden="true" />
              {!collapsed ? <span>{SAUDE_SYSTEM_DASHBOARD.label}</span> : <span className="sr-only">{SAUDE_SYSTEM_DASHBOARD.label}</span>}
            </a>
          </li>
        </ul>

        {!collapsed ? (
          <p className="mb-[var(--space-2)] mt-[var(--space-4)] px-[var(--space-2)] text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Módulos
          </p>
        ) : (
          <span className="sr-only">Módulos de saúde</span>
        )}

        <ul className="flex flex-col gap-[var(--space-2)]">
          {SAUDE_MODULES_NAV.map((mod) => {
            const active = isModuleActive(modules, mod.moduleKey)
            return (
              <li key={mod.moduleKey}>
                <SaudeModuleAccordion
                  config={mod}
                  active={active}
                  expanded={expandedModuleKey === mod.moduleKey}
                  pathname={pathname}
                  collapsed={collapsed}
                  onToggle={() => handleToggleModule(mod.moduleKey)}
                  onNavigate={onNavigate}
                />
              </li>
            )
          })}
        </ul>

        {showAdminNav ? (
          <ul className="mt-[var(--space-4)] flex flex-col gap-[var(--space-1)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActivePath(pathname, item.href)
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-[44px] items-center gap-[var(--space-3)] rounded-[var(--radius)] px-[var(--space-3)] text-[length:var(--text-sm)] transition-colors',
                      focusRingClassName,
                      collapsed && 'mx-auto min-w-[44px] justify-center px-0',
                      active
                        ? 'bg-[var(--color-primary-light)] font-bold text-[var(--color-primary)]'
                        : 'font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    {!collapsed ? <span>{item.label}</span> : <span className="sr-only">{item.label}</span>}
                  </a>
                </li>
              )
            })}
          </ul>
        ) : null}

        {showTfdConfigNav ? (
          <div className="mt-auto border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <a
              href={SAUDE_CONFIG_NAV.href}
              onClick={onNavigate}
              title={collapsed ? SAUDE_CONFIG_NAV.label : undefined}
              aria-current={configActive ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] items-center gap-[var(--space-3)] rounded-[var(--radius)] px-[var(--space-3)] text-[length:var(--text-sm)] transition-colors',
                focusRingClassName,
                collapsed && 'mx-auto min-w-[44px] justify-center px-0',
                configActive
                  ? 'bg-[var(--color-primary-light)] font-bold text-[var(--color-primary)]'
                  : 'font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
              )}
            >
              <ConfigIcon className="size-5 shrink-0" aria-hidden="true" />
              {!collapsed ? <span>{SAUDE_CONFIG_NAV.label}</span> : <span className="sr-only">{SAUDE_CONFIG_NAV.label}</span>}
            </a>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
