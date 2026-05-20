import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@saude/core-auth'

const PUBLIC_PATHS = ['/login', '/api/auth']

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) {
      return first
    }
  }

  const realIp = req.headers.get('x-real-ip')?.trim()
  return realIp || null
}

function isIpAllowed(clientIp: string | null): boolean {
  if (!clientIp) {
    return false
  }

  const allowedIps = process.env.SUPERADMIN_ALLOWED_IPS
  if (!allowedIps?.trim()) {
    return false
  }

  const allowlist = allowedIps
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean)

  return allowlist.includes(clientIp)
}

function shouldEnforceIpAllowlist(): boolean {
  return process.env.NODE_ENV !== 'development'
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (shouldEnforceIpAllowlist() && !isIpAllowed(getClientIp(req))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const res = NextResponse.next()
  res.headers.set('x-user-id', session.user.id)
  res.headers.set('x-user-role', session.user.role)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
