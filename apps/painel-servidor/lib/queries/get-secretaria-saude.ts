import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { SecretariaSaudeItem } from '../types/organograma.types'

export async function getSecretariaSaude(): Promise<SecretariaSaudeItem> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.ORGANOGRAMA)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const row = await db.secretaria.findFirst({
    where: { tenant_id: tenantId },
    select: {
      id: true,
      nome: true,
      sigla: true,
      ativa: true,
    },
    orderBy: { created_at: 'asc' },
  })

  if (!row) {
    throw new Error(
      'Secretaria Municipal de Saúde não provisionada para este município. Contate o suporte da plataforma.'
    )
  }

  return {
    id: row.id,
    nome: row.nome,
    sigla: row.sigla,
    ativa: row.ativa,
  }
}
