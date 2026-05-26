import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import { resolveTfdConfiguracoesHref } from '@saude/mod-saude-tfd'
import { notFound, redirect } from 'next/navigation'

export default async function TfdConfiguracoesIndexPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')

  const href = resolveTfdConfiguracoesHref(session)
  if (!href) {
    notFound()
  }

  redirect(href)
}
