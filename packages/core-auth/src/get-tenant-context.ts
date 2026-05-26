import 'server-only'

import { getPrismaAdmin, getTenantByDomain } from '@saude/core-db'
import { headers } from 'next/headers'
import type { TenantContext } from './tenant-resolver'

function parseHeaderJson<T extends Record<string, unknown>>(
  raw: string | null,
  fallback: T
): T {
  if (!raw?.trim()) {
    return fallback
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fallback
    }
    return parsed as T
  } catch {
    return fallback
  }
}

function normalizeTheme(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'string') {
      result[key] = val
    }
  }
  return result
}

function normalizeModules(value: unknown): Record<string, Record<string, boolean>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  const result: Record<string, Record<string, boolean>> = {}
  for (const [sistema, modulos] of Object.entries(value)) {
    if (typeof modulos !== 'object' || modulos === null || Array.isArray(modulos)) {
      continue
    }
    const normalized: Record<string, boolean> = {}
    for (const [modulo, ativo] of Object.entries(modulos)) {
      if (typeof ativo === 'boolean') {
        normalized[modulo] = ativo
      }
    }
    result[sistema] = normalized
  }
  return result
}

function tenantFromHeaders(h: Headers): TenantContext | null {
  const id = h.get('x-tenant-id')?.trim()
  if (!id) {
    return null
  }

  return {
    id,
    slug: h.get('x-tenant-slug')?.trim() ?? '',
    name: '',
    theme: parseHeaderJson(h.get('x-tenant-theme'), {}),
    modules: parseHeaderJson(h.get('x-tenant-modules'), {}),
    settings: {},
  }
}

const tenantSelect = {
  id: true,
  slug: true,
  name: true,
  modules: true,
  theme: true,
  settings: true,
  active: true,
} as const

function mapTenantRow(tenant: {
  id: string
  slug: string
  name: string
  modules: unknown
  theme: unknown
  settings: unknown
  active: boolean
}): TenantContext | null {
  if (!tenant.active) {
    return null
  }

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    theme: normalizeTheme(tenant.theme),
    modules: normalizeModules(tenant.modules),
    settings:
      typeof tenant.settings === 'object' &&
      tenant.settings !== null &&
      !Array.isArray(tenant.settings)
        ? (tenant.settings as Record<string, unknown>)
        : {},
  }
}

async function tenantFromDomain(): Promise<TenantContext | null> {
  const h = await headers()
  const host = h.get('host') ?? ''
  const domain = host.replace(/^www\./, '').split(':')[0] ?? ''
  if (!domain || domain === process.env.ADMIN_DOMAIN) {
    return null
  }

  let row = await getTenantByDomain(domain)

  if (!row) {
    const fallbackSlug = process.env.DEV_TENANT_SLUG?.trim()
    if (fallbackSlug) {
      row = await getPrismaAdmin().tenant.findFirst({
        where: { slug: fallbackSlug },
        select: tenantSelect,
      })
    }
  }

  return row ? mapTenantRow(row) : null
}

export async function getTenantContext(): Promise<TenantContext> {
  const h = await headers()
  const fromHeaders = tenantFromHeaders(h)
  if (fromHeaders) {
    return fromHeaders
  }

  const fromDomain = await tenantFromDomain()
  if (fromDomain) {
    return fromDomain
  }

  throw new Error(
    'Tenant context não encontrado. Verifique o domínio do município, MIDDLEWARE_INTERNAL_SECRET e DEV_TENANT_SLUG no deploy.'
  )
}

export async function assertModuleActive(sistema: string, modulo: string): Promise<void> {
  const tenant = await getTenantContext()
  const ativo = tenant.modules?.[sistema]?.[modulo]
  if (!ativo) {
    const { notFound } = await import('next/navigation')
    notFound()
  }
}
