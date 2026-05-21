import { assertModuleActive, getTenantContext, requireTenantRole } from '@saude/core-auth'
import { notFound } from 'next/navigation'

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
  await requireTenantRole('GESTOR')

  return children
}
