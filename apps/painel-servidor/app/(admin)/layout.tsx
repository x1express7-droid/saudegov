import { requireTenantRole } from '@saude/core-auth/server'
import { getTenantContext } from '@saude/core-auth/get-tenant-context'
import { getTfdFinanceiroVisibleNav, resolveTfdConfiguracoesHref } from '@saude/mod-saude-tfd'
import { attachTfdFinanceiroNavIcons } from '@saude/ui'
import { themeToCssVarsStyle } from '../../lib/theme-to-css-vars'
import { resolveConfiguracoesHref } from '../../lib/utils/configuracoes-nav'
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

  const theme = tenant.theme ?? {}
  const municipalityName =
    (theme.municipalityName ?? theme.municipality_name ?? tenant.name) || 'Município'

  const configHref = resolveConfiguracoesHref(session)
  const showConfigNav = configHref !== null
  const tfdConfigNavChild = resolveTfdConfiguracoesHref(session)
    ? {
        label: 'Config. TFD',
        href: '/saude/tfd/configuracoes',
        icon: 'Settings' as const,
      }
    : undefined
  const tfdFinanceiroNav = attachTfdFinanceiroNavIcons(getTfdFinanceiroVisibleNav(session))

  const themeCssVars = themeToCssVarsStyle(theme)

  return (
    <div className="min-h-screen" style={themeCssVars}>
    <AppShell
      pathname={pathname}
      modules={tenant.modules}
      municipalityName={municipalityName}
      userName={session.user.name}
      logoUrl={theme.logoUrl ?? theme.logo_url}
      showConfigNav={showConfigNav}
      configHref={configHref ?? undefined}
      tfdConfigNavChild={tfdConfigNavChild}
      tfdFinanceiroNav={tfdFinanceiroNav}
    >
      {children}
    </AppShell>
    </div>
  )
}
