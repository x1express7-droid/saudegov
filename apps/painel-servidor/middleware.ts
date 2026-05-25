import { getAuthJwtFromRequest } from '@saude/core-auth/middleware-jwt'
import { resolveTenantEdge, type TenantContext } from '@saude/core-auth/edge'
import { type NextRequest, NextResponse } from 'next/server'

import { isLocalDevHost, resolveDevTenantFromEnv } from './lib/resolve-dev-tenant'

const PUBLIC_PATHS = ['/login', '/recuperar-senha', '/redefinir-senha', '/api/auth']

const INTERNAL_API_PREFIXES = ['/api/cron', '/api/internal']

function nextWithRequestHeaders(
  req: NextRequest,
  extra: Record<string, string>
): NextResponse {
  const requestHeaders = new Headers(req.headers)
  for (const [key, value] of Object.entries(extra)) {
    requestHeaders.set(key, value)
  }
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

function applyTenantHeaders(
  req: NextRequest,
  tenant: TenantContext,
  extra: Record<string, string>
): NextResponse {
  return nextWithRequestHeaders(req, {
    'x-tenant-id': tenant.id,
    'x-tenant-slug': tenant.slug,
    'x-tenant-modules': JSON.stringify(tenant.modules),
    'x-tenant-theme': JSON.stringify(tenant.theme),
    'x-pathname': req.nextUrl.pathname,
    ...extra,
  })
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (INTERNAL_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const host = req.headers.get('host') ?? ''
  const domain = host.replace(/^www\./, '').split(':')[0] ?? ''

  let tenant: TenantContext | null = null
  if (isLocalDevHost(domain)) {
    tenant = resolveDevTenantFromEnv() ?? (await resolveTenantEdge(req))
  } else {
    tenant = await resolveTenantEdge(req)
  }

  if (!tenant) {
    tenant = resolveDevTenantFromEnv()
  }

  if (!tenant) {
    return NextResponse.rewrite(new URL('/404', req.url))
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return applyTenantHeaders(req, tenant, {})
  }

  const token = await getAuthJwtFromRequest(req)
  const userId = token?.id as string | undefined
  const role = token?.role as string | undefined
  const tenantId = (token?.tenantId as string | null | undefined) ?? null
  if (!userId || !role) {
    return NextResponse.redirect(new URL('/login?error=session', req.url))
  }

  if (role !== 'SUPERADMIN' && tenantId !== tenant.id) {
    return NextResponse.redirect(new URL('/login?error=credentials', req.url))
  }

  return applyTenantHeaders(req, tenant, {
    'x-user-id': userId,
    'x-user-role': role,
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
