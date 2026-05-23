/** Variáveis de ambiente Auth.js — compatível com Edge (sem imports server-only). */

export function authSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
}

/** Cookies Secure exigem HTTPS no browser; use AUTH_COOKIE_SECURE=false em staging HTTP. */
export function authUsesSecureCookies(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase()
  if (override === 'false' || override === '0' || override === 'no') {
    return false
  }
  if (override === 'true' || override === '1' || override === 'yes') {
    return true
  }

  const url = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || ''
  if (!url) {
    return process.env.NODE_ENV === 'production'
  }

  return url.startsWith('https://')
}
