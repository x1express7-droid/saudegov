import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { AcompanhanteSolicitacaoOption } from '../utils/acompanhante-labels'

export type { AcompanhanteSolicitacaoOption } from '../utils/acompanhante-labels'
export { labelRelacaoAcompanhante } from '../utils/acompanhante-labels'

export async function getAcompanhantesSolicitacao(
  solicitacaoId: string
): Promise<AcompanhanteSolicitacaoOption[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const processoWhere =
    session.user.role === 'SERVIDOR' && session.user.setorId
      ? { setor_id: session.user.setorId }
      : {}

  const solicitacao = await db.tfdSolicitacao.findFirst({
    where: {
      id: solicitacaoId,
      tenant_id: tenantId,
      ...(Object.keys(processoWhere).length > 0 ? { processo: processoWhere } : {}),
    },
    select: { id: true },
  })

  if (!solicitacao) {
    return []
  }

  const rows = await db.tfdAcompanhante.findMany({
    where: {
      tenant_id: tenantId,
      solicitacao_id: solicitacaoId,
    },
    select: {
      id: true,
      nome: true,
      relacao: true,
    },
    orderBy: { created_at: 'asc' },
  })

  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    relacao: row.relacao,
  }))
}
