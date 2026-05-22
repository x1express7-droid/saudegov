import { hasPermission, requireTenantRole } from '@saude/core-auth/server'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import { getTenantContext } from '@saude/core-auth/get-tenant-context'
import { themeToCssVarsStyle } from '../../lib/theme-to-css-vars'
import { headers } from 'next/headers'
import { AppShell } from '../../components/app-shell'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireTenantRole('ADMIN')
  const tenant = await getTenantContext()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/'

  const municipalityName =
    tenant.theme.municipalityName ?? tenant.theme.municipality_name ?? 'Município'

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
      showTfdConfigNav
      showTfdDashboardNav={hasPermission(session, TFD_PERMISSIONS.VER_DASHBOARD)}
    >
      {children}
    </AppShell>
    </div>
  )
}
