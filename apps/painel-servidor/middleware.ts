import { type NextRequest, NextResponse } from 'next/server'
import { auth, resolveTenant } from '@saude/core-auth'

const PUBLIC_PATHS = ['/login', '/recuperar-senha', '/redefinir-senha', '/api/auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const tenant = await resolveTenant(req)
  if (!tenant) {
    return NextResponse.rewrite(new URL('/404', req.url))
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next()
    res.headers.set('x-tenant-id', tenant.id)
    return res
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session.user.role !== 'SUPERADMIN' && session.user.tenantId !== tenant.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const res = NextResponse.next()
  res.headers.set('x-tenant-id', tenant.id)
  res.headers.set('x-tenant-slug', tenant.slug)
  res.headers.set('x-tenant-modules', JSON.stringify(tenant.modules))
  res.headers.set('x-tenant-theme', JSON.stringify(tenant.theme))
  res.headers.set('x-user-id', session.user.id)
  res.headers.set('x-user-role', session.user.role)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
