import { getTenantContext, requireTenantRole } from '@saude/core-auth'
import { headers } from 'next/headers'
import { AppShell } from '../../components/app-shell'

export default async function ServidorLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireTenantRole('SERVIDOR')
  const tenant = await getTenantContext()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/'

  const municipalityName =
    tenant.theme.municipalityName ?? tenant.theme.municipality_name ?? 'Município'

  return (
    <AppShell
      pathname={pathname}
      modules={tenant.modules}
      municipalityName={municipalityName}
      userName={session.user.name}
      logoUrl={tenant.theme.logoUrl ?? tenant.theme.logo_url}
    >
      {children}
    </AppShell>
  )
}
