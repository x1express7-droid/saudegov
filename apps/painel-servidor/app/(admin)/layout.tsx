import { requireTenantRole } from '@saude/core-auth/server'
import { getTenantContext } from '@saude/core-auth/get-tenant-context'
import { getTfdFinanceiroVisibleNav, resolveTfdConfiguracoesHref } from '@saude/mod-saude-tfd'
import { attachTfdFinanceiroNavIcons } from '@saude/ui'
import { themeToCssVarsStyle } from '../../lib/theme-to-css-vars'
import { headers } from 'next/headers'
import { AppShell } from '../../components/app-shell'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  const session = await requireTenantRole('ADMIN')

  const tenant = await getTenantContext()

  const municipalityName =
    tenant.theme.municipalityName ?? tenant.theme.municipality_name ?? 'Município'

  const tfdConfigHref = resolveTfdConfiguracoesHref(session)
  const showTfdConfigNav = tfdConfigHref !== null
  const tfdFinanceiroNav = attachTfdFinanceiroNavIcons(getTfdFinanceiroVisibleNav(session))

  const themeCssVars = themeToCssVarsStyle(tenant.theme)

  return (
    <div className="min-h-screen" style={themeCssVars}>
    <AppShell
      pathname={pathname}
      modules={tenant.modules}
      municipalityName={municipalityName}
      userName={session.user.name}
      logoUrl={tenant.theme.logoUrl ?? tenant.theme.logo_url}
      showAdminNav
      showTfdConfigNav={showTfdConfigNav}
      tfdConfigHref={tfdConfigHref ?? undefined}
      tfdFinanceiroNav={tfdFinanceiroNav}
    >
      {children}
    </AppShell>
    </div>
  )
}
