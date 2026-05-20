import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { SetorSelectOption } from '../types/responsaveis.types'

export async function getSetoresParaServidorForm(): Promise<SetorSelectOption[]> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.SERVIDORES)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.setor.findMany({
    where: { tenant_id: tenantId, ativo: true },
    select: {
      id: true,
      nome: true,
      sigla: true,
      departamento: {
        select: { nome: true },
      },
    },
    orderBy: [
      { departamento: { nome: 'asc' } },
      { nome: 'asc' },
    ],
  })

  return rows.map((row) => {
    const setorLabel = row.sigla ? `${row.nome} (${row.sigla})` : row.nome
    return {
      value: row.id,
      departamentoNome: row.departamento.nome,
      label: `${row.departamento.nome} — ${setorLabel}`,
    }
  })
}
