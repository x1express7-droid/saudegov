import { resolveTenantEdge, type TenantContext } from '@saude/core-auth/edge'
import { getToken } from 'next-auth/jwt'
import { type NextRequest, NextResponse } from 'next/server'

import { isLocalDevHost, resolveDevTenantFromEnv } from './lib/resolve-dev-tenant'

const PUBLIC_PATHS = ['/login', '/recuperar-senha', '/redefinir-senha', '/api/auth']

const INTERNAL_API_PREFIXES = ['/api/cron', '/api/internal']

function authSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
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
    return NextResponse.rewrite(new URL('/404', req.url))
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next()
    res.headers.set('x-tenant-id', tenant.id)
    res.headers.set('x-pathname', pathname)
    return res
  }

  const token = await getToken({ req, secret: authSecret() })
  const userId = token?.id as string | undefined
  const role = token?.role as string | undefined
  const tenantId = (token?.tenantId as string | null | undefined) ?? null
  if (!userId || !role) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (role !== 'SUPERADMIN' && tenantId !== tenant.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const res = NextResponse.next()
  res.headers.set('x-tenant-id', tenant.id)
  res.headers.set('x-tenant-slug', tenant.slug)
  res.headers.set('x-tenant-modules', JSON.stringify(tenant.modules))
  res.headers.set('x-tenant-theme', JSON.stringify(tenant.theme))
  res.headers.set('x-user-id', userId)
  res.headers.set('x-user-role', role)
  res.headers.set('x-pathname', pathname)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
