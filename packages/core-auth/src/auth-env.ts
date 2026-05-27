/** Variáveis de ambiente Auth.js — compatível com Edge (sem imports server-only). */

export function authSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
}

function isLocalHttpAuthUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const localHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    return localHost && parsed.protocol === 'http:'
  } catch {
    return false
  }
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

  if (process.env.NODE_ENV !== 'production') {
    return false
  }

  const url = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || ''
  if (!url) {
    // Sem URL pública: não forçar Secure (evita quebra em localhost com `next start`)
    return false
  }

  if (isLocalHttpAuthUrl(url)) {
    return false
  }

  return url.startsWith('https://')
}
