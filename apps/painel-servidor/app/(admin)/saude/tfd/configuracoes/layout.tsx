import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { cn } from '@saude/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const TFD_CONFIGURACOES_NAV = [
  {
    label: 'Especialidades',
    href: '/saude/tfd/configuracoes/especialidades',
    permission: TFD_PERMISSIONS.CONFIGURAR_ESPECIALIDADES,
  },
  {
    label: 'Prestadores',
    href: '/saude/tfd/configuracoes/prestadores',
    permission: TFD_PERMISSIONS.CONFIGURAR_PRESTADORES,
  },
  {
    label: 'Veículos',
    href: '/saude/tfd/configuracoes/veiculos',
    permission: TFD_PERMISSIONS.GERENCIAR_FROTA,
  },
  {
    label: 'Motoristas',
    href: '/saude/tfd/configuracoes/motoristas',
    permission: TFD_PERMISSIONS.GERENCIAR_FROTA,
  },
  {
    label: 'Saldos',
    href: '/saude/tfd/configuracoes/saldos',
    permission: TFD_PERMISSIONS.GERENCIAR_SALDO,
  },
] as const

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default async function TfdConfiguracoesLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  const visibleNav = TFD_CONFIGURACOES_NAV.filter((item) =>
    hasPermission(session, item.permission)
  )

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      {visibleNav.length > 0 ? (
        <nav aria-label="Configurações TFD">
          <ul className="flex flex-wrap gap-[var(--space-1)] border-b border-[var(--color-border)]">
            {visibleNav.map((item) => {
              const active = isActivePath(pathname, item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-[44px] items-center border-b-2 px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] transition-colors',
                      active
                        ? 'border-b-[var(--color-primary)] font-semibold text-[var(--color-primary)]'
                        : 'border-b-transparent font-medium text-[var(--color-text-muted)] hover:border-b-[var(--color-border)] hover:text-[var(--color-text)]'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}
      {children}
    </div>
  )
}
