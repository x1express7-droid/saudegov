import {
  Activity,
  Building2,
  ClipboardList,
  LayoutDashboard,
  List,
  Network,
  Landmark,
  Palette,
  PlusCircle,
  Settings,
  UserSearch,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import { focusRingClassName } from '../utils/field-control'

export interface SidebarNavChildItem {
  label: string
  href: string
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
  /** Exibe o subitem Configurações TFD (ADMIN/GESTOR). */
  showTfdConfigNav?: boolean
}

function buildNavItems(
  modules: Record<string, Record<string, boolean>>,
  showAdminNav: boolean,
  showTfdConfigNav: boolean
): SidebarNavItem[] {
  const items: SidebarNavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="size-5 shrink-0" aria-hidden="true" />,
    },
  ]

  if (modules.saude?.tfd) {
    const tfdChildren: SidebarNavChildItem[] = [
      { label: 'Fila', href: '/saude/tfd' },
      { label: 'Nova solicitação', href: '/saude/tfd/nova' },
      { label: 'Pacientes', href: '/saude/tfd/pacientes' },
    ]

    if (showTfdConfigNav) {
      tfdChildren.push({
        label: 'Configurações',
        href: '/saude/tfd/configuracoes/especialidades',
      })
    }

    items.push({
      label: 'TFD',
      href: '/saude/tfd',
      icon: <ClipboardList className="size-5 shrink-0" aria-hidden="true" />,
      children: tfdChildren,
    })
  }

  if (showAdminNav) {
    items.push(
      {
        label: 'Organograma',
        href: '/configuracoes/organograma',
        icon: <Building2 className="size-5 shrink-0" aria-hidden="true" />,
      },
      {
        label: 'Responsáveis',
        href: '/configuracoes/responsaveis',
        icon: <Network className="size-5 shrink-0" aria-hidden="true" />,
      },
      {
        label: 'Servidores',
        href: '/configuracoes/servidores',
        icon: <Users className="size-5 shrink-0" aria-hidden="true" />,
      },
      {
        label: 'Tema',
        href: '/configuracoes/tema',
        icon: <Palette className="size-5 shrink-0" aria-hidden="true" />,
      },
      {
        label: 'Município',
        href: '/configuracoes/municipio',
        icon: <Landmark className="size-5 shrink-0" aria-hidden="true" />,
      }
    )
  }

  return items
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isTfdSectionActive(pathname: string, children: SidebarNavChildItem[]): boolean {
  if (pathname === '/saude/tfd' || pathname.startsWith('/saude/tfd/')) {
    return true
  }
  return children.some((child) => isActivePath(pathname, child.href))
}

function childIcon(href: string): ReactNode {
  if (href === '/saude/tfd') {
    return <List className="size-4 shrink-0" aria-hidden="true" />
  }
  if (href === '/saude/tfd/nova') {
    return <PlusCircle className="size-4 shrink-0" aria-hidden="true" />
  }
  if (href === '/saude/tfd/pacientes') {
    return <UserSearch className="size-4 shrink-0" aria-hidden="true" />
  }
  if (href.startsWith('/saude/tfd/configuracoes')) {
    return <Settings className="size-4 shrink-0" aria-hidden="true" />
  }
  return null
}

export function Sidebar({
  modules,
  pathname,
  className,
  collapsed = false,
  onNavigate,
  showAdminNav = false,
  showTfdConfigNav = false,
}: SidebarProps) {
  const items = buildNavItems(modules, showAdminNav, showTfdConfigNav)

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] py-[var(--space-4)]',
        collapsed ? 'w-16' : 'w-[240px]',
        className
      )}
    >
      <div
        className={cn(
          'mb-[var(--space-4)] flex items-center gap-[var(--space-2)] px-[var(--space-3)] text-[var(--color-primary)]',
          collapsed && 'justify-center px-0'
        )}
      >
        <Activity className="size-5 shrink-0" aria-hidden="true" />
        {!collapsed ? (
          <span className="text-[length:var(--text-sm)] font-semibold">Saúde</span>
        ) : (
          <span className="sr-only">Saúde</span>
        )}
      </div>

      <ul className="flex flex-col gap-[var(--space-1)] px-[var(--space-2)]">
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length) && !collapsed
          const sectionActive =
            hasChildren && item.children
              ? isTfdSectionActive(pathname, item.children)
              : isActivePath(pathname, item.href)

          if (hasChildren && item.children) {
            return (
              <li key={item.href} className="flex flex-col gap-[var(--space-1)]">
                <a
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={sectionActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[44px] min-w-[44px] items-center gap-[var(--space-3)] rounded-[var(--radius)] px-[var(--space-3)] text-[length:var(--text-sm)] transition-colors',
                    focusRingClassName,
                    sectionActive
                      ? 'border-l-[3px] border-l-[var(--color-primary)] bg-[var(--color-primary-light)] font-semibold text-[var(--color-primary)]'
                      : 'border-l-[3px] border-l-transparent font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
                <ul
                  className="flex flex-col gap-[var(--space-1)] border-l border-[var(--color-border)] pl-[var(--space-3)] ml-[var(--space-4)]"
                  aria-label={`${item.label} — atalhos`}
                >
                  {item.children.map((child) => {
                    const childActive = isActivePath(pathname, child.href)

                    return (
                      <li key={child.href}>
                        <a
                          href={child.href}
                          onClick={onNavigate}
                          aria-current={childActive ? 'page' : undefined}
                          className={cn(
                            'flex min-h-[40px] items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] px-[var(--space-2)] text-[length:var(--text-sm)] transition-colors',
                            focusRingClassName,
                            childActive
                              ? 'bg-[var(--color-primary-light)] font-semibold text-[var(--color-primary)]'
                              : 'font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                          )}
                        >
                          {childIcon(child.href)}
                          <span>{child.label}</span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          }

          const active = isActivePath(pathname, item.href)

          return (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center gap-[var(--space-3)] rounded-[var(--radius)] px-[var(--space-3)] text-[length:var(--text-sm)] transition-colors',
                  focusRingClassName,
                  collapsed && 'mx-auto min-w-[44px] justify-center px-0',
                  active
                    ? 'border-l-[3px] border-l-[var(--color-primary)] bg-[var(--color-primary-light)] font-semibold text-[var(--color-primary)]'
                    : 'border-l-[3px] border-l-transparent font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                )}
              >
                {item.icon}
                {!collapsed ? (
                  <span>{item.label}</span>
                ) : (
                  <span className="sr-only">{item.label}</span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
