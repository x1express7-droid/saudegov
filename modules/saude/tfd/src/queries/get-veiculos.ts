import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { TFD_PERMISSIONS } from '../permissions'
import type { TfdListagemFiltros, TfdPaginatedResult, TfdVeiculoListItem } from '../types/tfd.types'

export async function getVeiculosTfd(
  filtros: TfdListagemFiltros = {}
): Promise<TfdPaginatedResult<TfdVeiculoListItem>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_FROTA)

  const tenantId = session.user.tenantId!
  const page = filtros.page ?? 1
  const perPage = filtros.perPage ?? 20
  const db = await getPrismaForTenant(tenantId)

  const where = {
    tenant_id: tenantId,
    ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
  }

  const [rows, total] = await Promise.all([
    db.tfdVeiculo.findMany({
      where,
      select: {
        id: true,
        placa: true,
        modelo: true,
        capacidade_passageiros: true,
        ativo: true,
        created_at: true,
      },
      orderBy: { placa: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdVeiculo.count({ where }),
  ])

  return {
    items: rows.map((row) => ({
      id: row.id,
      placa: row.placa,
      modelo: row.modelo,
      capacidadePassageiros: row.capacidade_passageiros,
      ativo: row.ativo,
      createdAt: row.created_at.toISOString(),
    })),
    total,
    page,
    perPage,
  }
}
