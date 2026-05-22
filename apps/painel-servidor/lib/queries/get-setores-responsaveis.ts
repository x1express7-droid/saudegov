import { requireTenantRole, requirePermission } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { SetorResponsavelItem } from '../types/responsaveis.types'

export async function getSetoresResponsaveis(): Promise<SetorResponsavelItem[]> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.RESPONSAVEIS)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.moduloSetorResponsavel.findMany({
    where: { tenant_id: tenantId },
    select: {
      id: true,
      modulo: true,
      setor_id: true,
      ativo: true,
      setor: {
        select: {
          nome: true,
          sigla: true,
          departamento: {
            select: { nome: true },
          },
        },
      },
    },
    orderBy: [{ modulo: 'asc' }, { created_at: 'desc' }],
  })

  return rows.map((row) => ({
    id: row.id,
    modulo: row.modulo,
    setorId: row.setor_id,
    setorNome: row.setor.nome,
    setorSigla: row.setor.sigla,
    departamentoNome: row.setor.departamento.nome,
    ativo: row.ativo,
  }))
}
