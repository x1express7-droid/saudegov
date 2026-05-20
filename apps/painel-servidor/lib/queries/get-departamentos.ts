import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { DepartamentoListItem } from '../types/organograma.types'

interface Filtros {
  secretariaId?: string
}

export async function getDepartamentos(
  filtros: Filtros = {}
): Promise<DepartamentoListItem[]> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.ORGANOGRAMA)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.departamento.findMany({
    where: {
      tenant_id: tenantId,
      ...(filtros.secretariaId ? { secretaria_id: filtros.secretariaId } : {}),
    },
    select: {
      id: true,
      secretaria_id: true,
      nome: true,
      sigla: true,
      ativo: true,
      created_at: true,
      _count: {
        select: {
          setores: { where: { ativo: true } },
        },
      },
    },
    orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
  })

  return rows.map((row) => ({
    id: row.id,
    secretariaId: row.secretaria_id,
    nome: row.nome,
    sigla: row.sigla,
    ativo: row.ativo,
    setoresAtivos: row._count.setores,
    createdAt: row.created_at.toISOString(),
  }))
}
