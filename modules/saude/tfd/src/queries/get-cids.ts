import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdListagemFiltros, TfdPaginatedResult } from '../types/tfd.types'

export interface TfdCidListItem {
  id: string
  codigo: string
  descricao: string
  ativo: boolean
  createdAt: string
}

export async function getCidsTfd(
  filtros: TfdListagemFiltros = {}
): Promise<TfdPaginatedResult<TfdCidListItem>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const page = filtros.page ?? 1
  const perPage = filtros.perPage ?? 500
  const db = await getPrismaForTenant(tenantId)

  if (!db.tfdCid) {
    throw new Error(
      'Prisma Client desatualizado: execute `npx prisma generate` em packages/core-db e reinicie o servidor.'
    )
  }

  const where = {
    tenant_id: tenantId,
    ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
  }

  const [rows, total] = await Promise.all([
    db.tfdCid.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        descricao: true,
        ativo: true,
        created_at: true,
      },
      orderBy: [{ codigo: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdCid.count({ where }),
  ])

  return {
    items: rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      descricao: row.descricao,
      ativo: row.ativo,
      createdAt: row.created_at.toISOString(),
    })),
    total,
    page,
    perPage,
  }
}
