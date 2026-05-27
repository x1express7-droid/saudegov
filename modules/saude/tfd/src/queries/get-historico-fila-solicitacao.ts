import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { TfdFilaMovimentacaoHistoricoItem } from '../types/tfd.types'

export async function getHistoricoFilaSolicitacao(
  solicitacaoId: string
): Promise<TfdFilaMovimentacaoHistoricoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const solicitacao = await db.tfdSolicitacao.findFirst({
    where: {
      id: solicitacaoId,
      tenant_id: tenantId,
    },
    select: { id: true },
  })

  if (!solicitacao) {
    return []
  }

  const rows = await db.tfdFilaMovimentacao.findMany({
    where: {
      tenant_id: tenantId,
      solicitacao_id: solicitacaoId,
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      tipo_movimentacao: true,
      posicao_anterior: true,
      posicao_nova: true,
      justificativa: true,
      created_at: true,
      usuario: {
        select: { name: true },
      },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    tipoMovimentacao: row.tipo_movimentacao,
    posicaoAnterior: row.posicao_anterior,
    posicaoNova: row.posicao_nova,
    justificativa: row.justificativa,
    usuarioNome: row.usuario.name,
    criadoEm: row.created_at.toISOString(),
  }))
}
