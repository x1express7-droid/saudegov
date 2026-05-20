import { requireSuperAdmin } from '@saude/core-auth'
import { getPrismaAdmin } from '@saude/core-db'

export interface MunicipioDetalhe {
  id: string
  nome: string
  uf: string | null
  slug: string
  domain: string
  domainCustom: string | null
  ativo: boolean
  modules: Record<string, Record<string, boolean>>
  settings: Record<string, unknown>
  createdAt: string
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

function parseSettings(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }
  return value as Record<string, unknown>
}

function extractUf(settings: unknown): string | null {
  if (typeof settings !== 'object' || settings === null) {
    return null
  }

  const uf = (settings as Record<string, unknown>).uf
  return typeof uf === 'string' ? uf : null
}

export async function getMunicipio(id: string): Promise<MunicipioDetalhe | null> {
  await requireSuperAdmin()

  const normalizedId = id.trim()
  if (!normalizedId) {
    return null
  }

  const db = getPrismaAdmin()

  const row = await db.tenant.findUnique({
    where: { id: normalizedId },
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
  })

  if (!row) {
    return null
  }

  const settings = parseSettings(row.settings)

  return {
    id: row.id,
    nome: row.name,
    uf: extractUf(settings),
    slug: row.slug,
    domain: row.domain,
    domainCustom: row.domain_custom,
    ativo: row.active,
    modules: parseModules(row.modules),
    settings,
    createdAt: row.created_at.toISOString(),
  }
}
