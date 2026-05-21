import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { TFD_PERMISSIONS } from '../permissions'
import { isCnhVencendoEmBreve, isCnhVencida } from '../utils/prazos'
import type { TfdListagemFiltros, TfdMotoristaListItem, TfdPaginatedResult } from '../types/tfd.types'

export async function getMotoristasTfd(
  filtros: TfdListagemFiltros = {}
): Promise<TfdPaginatedResult<TfdMotoristaListItem>> {
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
    db.tfdMotorista.findMany({
      where,
      select: {
        id: true,
        user_id: true,
        cnh: true,
        cnh_categoria: true,
        cnh_validade: true,
        ativo: true,
        created_at: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdMotorista.count({ where }),
  ])

  return {
    items: rows.map((row) => {
      const cnhVencida = isCnhVencida(row.cnh_validade)
      const cnhVencendoEmBreve = isCnhVencendoEmBreve(row.cnh_validade)

      return {
        id: row.id,
        userId: row.user_id,
        userNome: row.user.name,
        userEmail: row.user.email,
        cnh: row.cnh,
        cnhCategoria: row.cnh_categoria,
        cnhValidade: row.cnh_validade.toISOString().slice(0, 10),
        cnhVencida,
        cnhVencendoEmBreve,
        ativo: row.ativo,
        createdAt: row.created_at.toISOString(),
      }
    }),
    total,
    page,
    perPage,
  }
}
