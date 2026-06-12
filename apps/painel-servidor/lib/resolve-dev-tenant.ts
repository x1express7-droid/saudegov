import type { TenantContext } from '@saude/core-auth/edge'

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1'])

export function isLocalDevHost(domain: string): boolean {
  return LOCAL_DEV_HOSTS.has(domain)
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

/** Tenant de desenvolvimento via variáveis de ambiente (sem Prisma no middleware). */
export function resolveDevTenantFromEnv(): TenantContext | null {
  const id = process.env.DEV_TENANT_ID?.trim()
  if (!id) {
    return null
  }

  return {
    id,
    slug: process.env.DEV_TENANT_SLUG?.trim() ?? 'campograndems',
    name: process.env.DEV_TENANT_NAME?.trim() ?? 'Município (dev)',
    theme: parseJsonEnv<Record<string, string>>(process.env.DEV_TENANT_THEME, {
      municipalityName: 'Campo Grande-MS',
      primaryColor: '#1a5fa8',
    }),
    modules: parseJsonEnv<Record<string, Record<string, boolean>>>(
      process.env.DEV_TENANT_MODULES,
      { saude: { tfd: true } }
    ),
    settings: parseJsonEnv<Record<string, unknown>>(process.env.DEV_TENANT_SETTINGS, {}),
  }
}
