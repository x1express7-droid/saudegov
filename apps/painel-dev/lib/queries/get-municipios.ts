import { requireSuperAdmin } from '@saude/core-auth'
import { getPrismaAdmin } from '@saude/core-db'

export interface MunicipioListItem {
  id: string
  nome: string
  uf: string | null
  slug: string
  domain: string
  domainCustom: string | null
  ativo: boolean
  modules: Record<string, Record<string, boolean>>
  createdAt: string
}

export interface GetMunicipiosFiltros {
  busca?: string
  ativo?: boolean
  page?: number
  perPage?: number
}

function parseModules(value: unknown): Record<string, Record<string, boolean>> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }

  const result: Record<string, Record<string, boolean>> = {}

  for (const [sistema, modulos] of Object.entries(value as Record<string, unknown>)) {
    if (typeof modulos !== 'object' || modulos === null) {
      continue
    }

    const parsedModulos: Record<string, boolean> = {}
    for (const [modulo, ativo] of Object.entries(modulos as Record<string, unknown>)) {
      if (typeof ativo === 'boolean') {
        parsedModulos[modulo] = ativo
      }
    }

    result[sistema] = parsedModulos
  }

  return result
}

function extractUf(settings: unknown): string | null {
  if (typeof settings !== 'object' || settings === null) {
    return null
  }

  const uf = (settings as Record<string, unknown>).uf
  return typeof uf === 'string' ? uf : null
}

export async function getMunicipios(
  filtros: GetMunicipiosFiltros = {}
): Promise<{ items: MunicipioListItem[]; total: number }> {
  await requireSuperAdmin()

  const { page = 1, perPage = 20, busca, ativo } = filtros
  const db = getPrismaAdmin()

  const buscaNormalizada = busca?.trim()

  const where = {
    ...(ativo !== undefined ? { active: ativo } : {}),
    ...(buscaNormalizada
      ? {
          OR: [
            { name: { contains: buscaNormalizada, mode: 'insensitive' as const } },
            { slug: { contains: buscaNormalizada, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    db.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        domain_custom: true,
        active: true,
        modules: true,
        settings: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tenant.count({ where }),
  ])

  const items: MunicipioListItem[] = rows.map((row) => ({
    id: row.id,
    nome: row.name,
    uf: extractUf(row.settings),
    slug: row.slug,
    domain: row.domain,
    domainCustom: row.domain_custom,
    ativo: row.active,
    modules: parseModules(row.modules),
    createdAt: row.created_at.toISOString(),
  }))

  return { items, total }
}
