import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdStatusSolicitacao } from '@prisma/client'

import type { TfdAlertaUrgente } from '../types/tfd.types'

const STATUS_OPERACIONAIS: TfdStatusSolicitacao[] = ['ENVIADO', 'EM_ANALISE', 'PENDENTE']

const solicitacaoUrgenteSelect = {
  id: true,
  protocolo: true,
  status: true,
  urgencia: true,
  created_at: true,
  paciente: { select: { nome: true } },
  especialidade: { select: { nome: true } },
} as const

/**
 * Solicitações MUITO_URGENTE em status operacionais — painel do dashboard (gestor).
 * @see docs/BUSINESS_RULES.md §1.4 e §1.2.1
 */
export async function getAlertasUrgentesTfd(): Promise<TfdAlertaUrgente[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdSolicitacao.findMany({
    where: {
      tenant_id: tenantId,
      urgencia: 'MUITO_URGENTE',
      status: { in: STATUS_OPERACIONAIS },
    },
    select: solicitacaoUrgenteSelect,
    orderBy: [{ created_at: 'asc' }],
  })

  return rows.map((row) => ({
    solicitacaoId: row.id,
    protocolo: row.protocolo,
    status: row.status,
    urgencia: row.urgencia,
    especialidade: row.especialidade?.nome ?? '—',
    paciente: { nome: row.paciente.nome },
    criadoEm: row.created_at.toISOString(),
  }))
}
