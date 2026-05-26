import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getTfdConfiguracoesVisibleNav,
  matchTfdConfiguracoesPath,
  matchTfdFinanceiroConfigPath,
} from '@saude/mod-saude-tfd'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { TfdConfiguracoesNav } from './components/tfd-configuracoes-nav'

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

  const visibleNav = getTfdConfiguracoesVisibleNav(session)
  const financeiroConfigPermission = matchTfdFinanceiroConfigPath(pathname)
  const saldosOnlyAccess =
    visibleNav.length === 0 &&
    financeiroConfigPermission !== null &&
    hasPermission(session, financeiroConfigPermission)

  if (visibleNav.length === 0 && !saldosOnlyAccess) {
    notFound()
  }

  const requiredPermission =
    matchTfdConfiguracoesPath(pathname) ?? financeiroConfigPermission
  if (requiredPermission && !hasPermission(session, requiredPermission)) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-8">
      {visibleNav.length > 0 ? <TfdConfiguracoesNav items={visibleNav} /> : null}
      {children}
    </div>
  )
}
