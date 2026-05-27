import { requireTenantRole } from '@saude/core-auth/server'
import { notFound, redirect } from 'next/navigation'

import { resolveConfiguracoesHref } from '../../../lib/utils/configuracoes-nav'

export default async function ConfiguracoesIndexPage() {
  const session = await requireTenantRole('ADMIN')
  const href = resolveConfiguracoesHref(session)

  if (!href) {
    notFound()
  }

  redirect(href)
}
