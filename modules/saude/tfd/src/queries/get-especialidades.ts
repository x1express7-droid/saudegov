import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdEspecialidadeListItem, TfdListagemFiltros, TfdPaginatedResult } from '../types/tfd.types'

export async function getEspecialidadesTfd(
  filtros: TfdListagemFiltros = {}
): Promise<TfdPaginatedResult<TfdEspecialidadeListItem>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const page = filtros.page ?? 1
  const perPage = filtros.perPage ?? 20
  const db = await getPrismaForTenant(tenantId)

  // `ativo` no filtro da API → coluna `ativa` no banco
  const where = {
    tenant_id: tenantId,
    ...(filtros.ativo !== undefined ? { ativa: filtros.ativo } : {}),
  }

  const [rows, total] = await Promise.all([
    db.tfdEspecialidade.findMany({
      where,
      select: {
        id: true,
        nome: true,
        ativa: true,
        created_at: true,
      },
      orderBy: { nome: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdEspecialidade.count({ where }),
  ])

  return {
    items: rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      ativa: row.ativa,
      createdAt: row.created_at.toISOString(),
    })),
    total,
    page,
    perPage,
  }
}
