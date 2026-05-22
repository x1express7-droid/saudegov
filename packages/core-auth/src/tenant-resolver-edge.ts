import type { NextRequest } from 'next/server'

import type { TenantContext } from './tenant-resolver'

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1'])

function getDomainFromRequest(req: NextRequest): string {
  const host = req.headers.get('host') ?? ''
  return host.replace(/^www\./, '').split(':')[0] ?? ''
}

function parseJsonEnv<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) {
    return fallback
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function resolveDevTenantFromEnv(): TenantContext | null {
  const id = process.env.DEV_TENANT_ID?.trim()
  if (!id) {
    return null
  }

  return {
    id,
    slug: process.env.DEV_TENANT_SLUG?.trim() ?? 'campograndems',
    name: process.env.DEV_TENANT_NAME?.trim() ?? 'Município (dev)',
    theme: parseJsonEnv<Record<string, string>>(process.env.DEV_TENANT_THEME, {}),
    modules: parseJsonEnv<Record<string, Record<string, boolean>>>(
      process.env.DEV_TENANT_MODULES,
      { saude: { tfd: true } }
    ),
    settings: parseJsonEnv<Record<string, unknown>>(process.env.DEV_TENANT_SETTINGS, {}),
  }
}

async function fetchTenantByDomain(
  req: NextRequest,
  domain: string
): Promise<TenantContext | null> {
  const internalUrl = new URL('/api/internal/tenant-by-domain', req.url)
  internalUrl.searchParams.set('domain', domain)

  const secret = process.env.MIDDLEWARE_INTERNAL_SECRET?.trim()
  const headers: HeadersInit = {}
  if (secret) {
    headers['x-internal-secret'] = secret
  }

  const response = await fetch(internalUrl, { headers, cache: 'no-store' })
  if (!response.ok) {
    return null
  }

  const body = (await response.json()) as TenantContext | { tenant: null }
  if ('tenant' in body && body.tenant === null) {
    return null
  }

  return body as TenantContext
}

/**
 * Resolve tenant no middleware (Edge) sem importar @saude/core-db.
 * Em localhost usa DEV_TENANT_* ou consulta a rota interna Node.js.
 */
export async function resolveTenantEdge(req: NextRequest): Promise<TenantContext | null> {
  const domain = getDomainFromRequest(req)
  if (!domain) {
    return null
  }

  if (domain === process.env.ADMIN_DOMAIN) {
    return null
  }

  if (LOCAL_DEV_HOSTS.has(domain)) {
    const fromEnv = resolveDevTenantFromEnv()
    if (fromEnv) {
      return fromEnv
    }
  }

  return fetchTenantByDomain(req, domain)
}
