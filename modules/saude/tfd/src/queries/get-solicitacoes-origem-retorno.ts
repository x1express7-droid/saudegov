import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type { TfdSolicitacaoOrigemRetornoItem } from '../types/tfd.types'

export interface GetSolicitacoesOrigemRetornoInput {
  pacienteId: string
}

type OrigemRetornoRow = {
  id: string
  processo: {
    protocolo: string
    concluido_at: Date | null
  }
  especialidade: { nome: string } | null
  prestador: { nome: string; cidade: string; estado: string } | null
  updated_at: Date
}

function mapToOrigemRetornoItem(row: OrigemRetornoRow): TfdSolicitacaoOrigemRetornoItem {
  const concluidoEm = row.processo.concluido_at ?? row.updated_at

  return {
    id: row.id,
    protocolo: row.processo.protocolo,
    especialidade: row.especialidade?.nome ?? '—',
    prestador: {
      nome: row.prestador?.nome ?? '—',
      cidade: row.prestador?.cidade ?? '—',
      estado: row.prestador?.estado ?? '—',
    },
    concluidoEm: concluidoEm.toISOString(),
  }
}

const origemRetornoSelect = {
  id: true,
  updated_at: true,
  processo: {
    select: {
      protocolo: true,
      concluido_at: true,
    },
  },
  especialidade: { select: { nome: true } },
  prestador: { select: { nome: true, cidade: true, estado: true } },
} as const

export async function getSolicitacoesOrigemRetornoTfd(
  input: GetSolicitacoesOrigemRetornoInput
): Promise<TfdSolicitacaoOrigemRetornoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdSolicitacao.findMany({
    where: {
      tenant_id: tenantId,
      paciente_id: input.pacienteId,
      status: 'CONCLUIDO',
    },
    select: origemRetornoSelect,
    orderBy: { updated_at: 'desc' },
  })

  return rows.map(mapToOrigemRetornoItem)
}
