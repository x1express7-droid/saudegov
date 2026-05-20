import type { NextRequest } from 'next/server'
import { getTenantByDomain } from '@saude/core-db'

export interface TenantContext {
  id: string
  slug: string
  name: string
  theme: Record<string, string>
  modules: Record<string, Record<string, boolean>>
  settings: Record<string, unknown>
}

export async function resolveTenant(req: NextRequest): Promise<TenantContext | null> {
  const host = req.headers.get('host') ?? ''
  const domain = host.replace(/^www\./, '').split(':')[0] ?? ''
  if (!domain) {
    return null
  }

  if (domain === process.env.ADMIN_DOMAIN) {
    return null
  }

  const tenant = await getTenantByDomain(domain)
  if (!tenant || !tenant.active) {
    return null
  }

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    theme: tenant.theme as Record<string, string>,
    modules: tenant.modules as Record<string, Record<string, boolean>>,
    settings: tenant.settings as Record<string, unknown>,
  }
}
