import { getPrismaAdmin, getTenantByDomain } from '@saude/core-db'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1'])

function isAuthorized(request: Request): boolean {
  const secret = process.env.MIDDLEWARE_INTERNAL_SECRET?.trim()
  if (!secret) {
    return process.env.NODE_ENV === 'development'
  }

  return request.headers.get('x-internal-secret') === secret
}

function mapTenantRow(tenant: {
  id: string
  slug: string
  name: string
  modules: unknown
  theme: unknown
  settings: unknown
  active: boolean
}) {
  if (!tenant.active) {
    return null
  }

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    theme: tenant.theme as Record<string, string>,
    modules: tenant.modules as Record<string, Record<string, boolean>>,
    settings: tenant.settings as Record<string, unknown>,
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const domain = new URL(request.url).searchParams.get('domain')?.trim()
  if (!domain) {
    return NextResponse.json({ tenant: null }, { status: 400 })
  }

  try {
    let tenant = null

    if (LOCAL_DEV_HOSTS.has(domain)) {
      const slug = process.env.DEV_TENANT_SLUG?.trim() ?? 'campograndems'
      const db = getPrismaAdmin()
      tenant = await db.tenant.findFirst({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          modules: true,
          theme: true,
          settings: true,
          active: true,
        },
      })
    } else {
      tenant = await getTenantByDomain(domain)
    }

    const mapped = tenant ? mapTenantRow(tenant) : null
    if (!mapped) {
      return NextResponse.json({ tenant: null }, { status: 404 })
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('[internal/tenant-by-domain] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return NextResponse.json(
      { error: 'Não foi possível resolver o tenant.' },
      { status: 500 }
    )
  }
}
