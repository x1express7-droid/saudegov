import { requireTenantRole, requirePermission } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { SetorListItem } from '../types/organograma.types'

interface Filtros {
  departamentoId?: string
}

export async function getSetores(filtros: Filtros = {}): Promise<SetorListItem[]> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.ORGANOGRAMA)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.setor.findMany({
    where: {
      tenant_id: tenantId,
      ...(filtros.departamentoId ? { departamento_id: filtros.departamentoId } : {}),
    },
    select: {
      id: true,
      departamento_id: true,
      nome: true,
      sigla: true,
      email_setor: true,
      ativo: true,
      created_at: true,
    },
    orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
  })

  return rows.map((row) => ({
    id: row.id,
    departamentoId: row.departamento_id,
    nome: row.nome,
    sigla: row.sigla,
    emailSetor: row.email_setor,
    ativo: row.ativo,
    createdAt: row.created_at.toISOString(),
  }))
}
