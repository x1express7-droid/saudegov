import 'server-only'

import { headers } from 'next/headers'
import type { TenantContext } from './tenant-resolver'

export async function getTenantContext(): Promise<TenantContext> {
  const h = await headers()
  const id = h.get('x-tenant-id')
  if (!id) {
    throw new Error('Tenant context não encontrado. Middleware não executou.')
  }

  return {
    id,
    slug: h.get('x-tenant-slug') ?? '',
    name: '',
    theme: JSON.parse(h.get('x-tenant-theme') ?? '{}') as Record<string, string>,
    modules: JSON.parse(h.get('x-tenant-modules') ?? '{}') as Record<
      string,
      Record<string, boolean>
    >,
    settings: {},
  }
}

export async function assertModuleActive(sistema: string, modulo: string): Promise<void> {
  const tenant = await getTenantContext()
  const ativo = tenant.modules?.[sistema]?.[modulo]
  if (!ativo) {
    const { notFound } = await import('next/navigation')
    notFound()
  }
}
