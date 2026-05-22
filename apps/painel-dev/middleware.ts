import { getToken } from 'next-auth/jwt'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth']

function authSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
}

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

  const token = await getToken({ req, secret: authSecret() })
  const userId = token?.id as string | undefined
  const role = token?.role as string | undefined
  if (!userId || !role) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (role !== 'SUPERADMIN') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const res = NextResponse.next()
  res.headers.set('x-user-id', userId)
  res.headers.set('x-user-role', role)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
