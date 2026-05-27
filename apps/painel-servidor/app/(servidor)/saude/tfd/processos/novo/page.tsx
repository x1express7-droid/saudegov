import { assertModuleActive, getTenantContext } from '@saude/core-auth/server'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Nova solicitação — Processos TFD',
}

interface ProcessoNovoPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function buildSearchString(
  params: Record<string, string | string[] | undefined>
): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, item)
      }
    } else {
      search.set(key, value)
    }
  }

  return search.toString()
}

export default async function ProcessoNovoPage({ searchParams }: ProcessoNovoPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')

  const params = await searchParams
  const query = buildSearchString(params)
  redirect(query ? `/saude/tfd/nova?${query}` : '/saude/tfd/nova')
}
