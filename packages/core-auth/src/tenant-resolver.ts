import type { NextRequest } from 'next/server'
import { getTenantByDomain } from '@saude/core-db'

const tenantCache = new Map<string, { tenant: TenantContext; expiresAt: number }>()
const CACHE_TTL_MS = parseInt(process.env.TENANT_CACHE_TTL_MS ?? '300000', 10)

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

  const cached = tenantCache.get(domain)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant
  }

  const tenant = await getTenantByDomain(domain)
  if (!tenant || !tenant.active) {
    return null
  }

  const context: TenantContext = {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    theme: tenant.theme as Record<string, string>,
    modules: tenant.modules as Record<string, Record<string, boolean>>,
    settings: tenant.settings as Record<string, unknown>,
  }

  tenantCache.set(domain, { tenant: context, expiresAt: Date.now() + CACHE_TTL_MS })
  return context
}

export function invalidateTenantCache(domain: string): void {
  tenantCache.delete(domain)
}
