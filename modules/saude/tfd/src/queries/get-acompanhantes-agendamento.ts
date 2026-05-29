import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { TfdRelacaoAcompanhante } from '../validators/solicitacao.schema'

export interface AcompanhanteAgendamentoItem {
  id: string
  nome: string
  relacao: TfdRelacaoAcompanhante
  telefone: string | null
}

export async function getAcompanhantesAgendamento(
  agendamentoId: string
): Promise<AcompanhanteAgendamentoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const agendamento = await db.tfdAgendamento.findFirst({
    where: {
      id: agendamentoId,
      tenant_id: tenantId,
    },
    select: { id: true },
  })

  if (!agendamento) {
    return []
  }

  const rows = await db.tfdAgendamentoAcompanhante.findMany({
    where: {
      tenant_id: tenantId,
      agendamento_id: agendamentoId,
    },
    select: {
      acompanhante: {
        select: {
          id: true,
          nome: true,
          relacao: true,
          telefone: true,
        },
      },
    },
    orderBy: { created_at: 'asc' },
  })

  return rows.map((row) => ({
    id: row.acompanhante.id,
    nome: row.acompanhante.nome,
    relacao: row.acompanhante.relacao,
    telefone: row.acompanhante.telefone,
  }))
}
