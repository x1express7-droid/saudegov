'use client'

import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  SAUDE_CONFIG_NAV,
  SAUDE_MODULES_NAV,
  SAUDE_SYSTEM_DASHBOARD,
  TFD_FINANCEIRO_SECTION_LABEL,
  type SaudeModuleNavConfig,
  type SaudeModuleToggleKey,
  type SaudeNavChildConfig,
} from '../config/saude-modules-nav'
import { cn } from '../utils/cn'
import { resolveSaudeNavIcon } from '../utils/saude-nav-icons'
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
  /** Exibe link de Configurações municipal (ADMIN) no rodapé. */
  showConfigNav?: boolean
  /** Destino do hub /configuracoes (primeira aba permitida). */
  configHref?: string
  /** Item Config. TFD no submenu do módulo TFD (última opção). */
  tfdConfigNavChild?: SaudeNavChildConfig
  /** Itens do submenu Financeiro TFD (já filtrados por permissão no servidor). */
  tfdFinanceiroNav?: SaudeNavChildConfig[]
  systemName?: string
}

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
  if (href === '/saude/tfd/solicitacoes') {
    if (pathname === '/saude/tfd/solicitacoes') {
      return true
    }
    const detalheSolicitacao = /^\/saude\/tfd\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      pathname
    )
    return detalheSolicitacao
  }
  if (href === '/saude/tfd/processos') {
    return (
      pathname === '/saude/tfd/processos' || pathname.startsWith('/saude/tfd/processos/')
    )
  }
  if (href === '/saude/tfd/dashboard') {
    return pathname === '/saude/tfd/dashboard'
  }
  if (href === '/saude/tfd/prestacoes') {
    return pathname === '/saude/tfd/prestacoes' || pathname.startsWith('/saude/tfd/prestacoes/')
  }
  if (href === '/saude/tfd/configuracoes') {
    return (
      pathname === '/saude/tfd/configuracoes' ||
      pathname.startsWith('/saude/tfd/configuracoes/')
    )
  }
  if (href === '/saude/tfd/saldos') {
    return pathname === '/saude/tfd/saldos' || pathname.startsWith('/saude/tfd/saldos/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function renderNavChildLink(
  child: SaudeNavChildConfig,
  pathname: string,
  onNavigate?: () => void
) {
  const ChildIcon = resolveSaudeNavIcon(child.icon)
  const childActive = isActivePath(pathname, child.href)

  return (
    <a
      href={child.href}
      onClick={onNavigate}
      aria-current={childActive ? 'page' : undefined}
      className={cn(
        'flex min-h-[40px] items-center gap-[var(--space-3)] rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] transition-colors',
        focusRingClassName,
        childActive
          ? 'bg-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-surface))] font-bold text-[var(--color-primary)]'
          : 'font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
      )}
    >
      {ChildIcon ? <ChildIcon className="size-5 shrink-0" aria-hidden="true" /> : null}
      <span>{child.label}</span>
    </a>
  )
}

interface SaudeModuleAccordionProps {
  config: SaudeModuleNavConfig
  active: boolean
  expanded: boolean
  pathname: string
  collapsed: boolean
  financeiroChildren?: SaudeNavChildConfig[]
  extraChildren?: SaudeNavChildConfig[]
  onToggle: () => void
  onNavigate?: () => void
}

function SaudeModuleAccordion({
  config,
  active,
  expanded,
  pathname,
  collapsed,
  financeiroChildren = [],
  extraChildren = [],
  onToggle,
  onNavigate,
}: SaudeModuleAccordionProps) {
  const ModuleIcon = resolveSaudeNavIcon(config.icon)
  const hasChildren =
    config.children.length > 0 || financeiroChildren.length > 0 || extraChildren.length > 0
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
        {ModuleIcon ? (
          <ModuleIcon className="size-[18px] shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
        ) : null}
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
        {ModuleIcon ? (
          <ModuleIcon
            className={cn(
              'size-[18px] shrink-0',
              sectionActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            )}
            aria-hidden="true"
          />
        ) : null}
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
          className="ml-[var(--space-5)] flex flex-col gap-[var(--space-1)] border-l border-[var(--color-border)] pl-[var(--space-4)]"
          aria-label={`${config.label} — navegação`}
        >
          {config.children.map((child) => (
            <li key={child.href}>{renderNavChildLink(child, pathname, onNavigate)}</li>
          ))}
          {financeiroChildren.length > 0 ? (
            <>
              <li className="pt-[var(--space-2)]">
                <span className="block px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {TFD_FINANCEIRO_SECTION_LABEL}
                </span>
              </li>
              {financeiroChildren.map((child) => (
                <li key={`financeiro-${child.href}`}>
                  {renderNavChildLink(child, pathname, onNavigate)}
                </li>
              ))}
            </>
          ) : null}
          {extraChildren.map((child) => (
            <li key={`extra-${child.href}`}>{renderNavChildLink(child, pathname, onNavigate)}</li>
          ))}
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
  showConfigNav = false,
  configHref,
  tfdConfigNavChild,
  tfdFinanceiroNav = [],
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
  const DashboardIcon = resolveSaudeNavIcon(SAUDE_SYSTEM_DASHBOARD.icon)
  const ConfigIcon = resolveSaudeNavIcon(SAUDE_CONFIG_NAV.icon)
  const configActive = pathname.startsWith(SAUDE_CONFIG_NAV.basePath)
  const configLinkHref = configHref ?? SAUDE_CONFIG_NAV.basePath

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
              {DashboardIcon ? <DashboardIcon className="size-5 shrink-0" aria-hidden="true" /> : null}
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
            const financeiroChildren =
              mod.moduleKey === 'tfd' && active ? tfdFinanceiroNav : undefined
            const extraChildren =
              mod.moduleKey === 'tfd' && active && tfdConfigNavChild
                ? [tfdConfigNavChild]
                : undefined
            return (
              <li key={mod.moduleKey}>
                <SaudeModuleAccordion
                  config={mod}
                  active={active}
                  expanded={expandedModuleKey === mod.moduleKey}
                  pathname={pathname}
                  collapsed={collapsed}
                  financeiroChildren={financeiroChildren}
                  extraChildren={extraChildren}
                  onToggle={() => handleToggleModule(mod.moduleKey)}
                  onNavigate={onNavigate}
                />
              </li>
            )
          })}
        </ul>

        {showConfigNav && configHref ? (
          <div className="mt-auto border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <a
              href={configLinkHref}
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
              {ConfigIcon ? <ConfigIcon className="size-5 shrink-0" aria-hidden="true" /> : null}
              {!collapsed ? (
                <span>{SAUDE_CONFIG_NAV.label}</span>
              ) : (
                <span className="sr-only">{SAUDE_CONFIG_NAV.label}</span>
              )}
            </a>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
