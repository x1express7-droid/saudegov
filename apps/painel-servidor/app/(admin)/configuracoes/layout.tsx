import {
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { TabNav } from '@saude/ui'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import {
  getConfiguracoesVisibleNav,
  matchConfiguracoesPath,
} from '../../../lib/utils/configuracoes-nav'

export default async function ConfiguracoesLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireTenantRole('ADMIN')
  await getTenantContext()

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  const visibleNav = getConfiguracoesVisibleNav(session)

  if (visibleNav.length === 0) {
    notFound()
  }

  const requiredPermission = matchConfiguracoesPath(pathname)
  if (requiredPermission && !hasPermission(session, requiredPermission)) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-8">
      <TabNav items={visibleNav} ariaLabel="Configurações do município" />
      {children}
    </div>
  )
}
