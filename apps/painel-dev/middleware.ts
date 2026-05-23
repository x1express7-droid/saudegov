import { getAuthJwtFromRequest } from '@saude/core-auth/middleware-jwt'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth']

function getClientIp(req: NextRequest): string | null {
  const cfIp = req.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) {
    return cfIp
  }

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

function isIpAllowlistConfigured(): boolean {
  return Boolean(process.env.SUPERADMIN_ALLOWED_IPS?.trim())
}

function isIpAllowed(clientIp: string | null): boolean {
  if (!isIpAllowlistConfigured()) {
    return true
  }

  if (!clientIp) {
    return false
  }

  const allowlist = process.env.SUPERADMIN_ALLOWED_IPS!
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean)

  return allowlist.includes(clientIp)
}

function shouldEnforceIpAllowlist(): boolean {
  if (process.env.SUPERADMIN_ENFORCE_IP === 'false') {
    return false
  }
  return process.env.NODE_ENV !== 'development'
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (shouldEnforceIpAllowlist() && isIpAllowlistConfigured() && !isIpAllowed(getClientIp(req))) {
    return NextResponse.redirect(new URL('/login?error=ip', req.url))
  }

  const token = await getAuthJwtFromRequest(req)
  const userId = token?.id as string | undefined
  const role = token?.role as string | undefined
  if (!userId || !role) {
    return NextResponse.redirect(new URL('/login?error=session', req.url))
  }

  if (role !== 'SUPERADMIN') {
    return NextResponse.redirect(new URL('/login?error=credentials', req.url))
  }

  const res = NextResponse.next()
  res.headers.set('x-user-id', userId)
  res.headers.set('x-user-role', role)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
