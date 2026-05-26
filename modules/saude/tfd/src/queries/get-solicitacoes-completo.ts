import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdStatusSolicitacao, TfdUrgencia } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import { exportSolicitacoesCsvSchema } from '../validators/exportacao.schema'
import {
  assertListagemExportWithinLimit,
  ListagemExportError,
} from './listagem-export'

export interface SolicitacaoExportRow {
  protocolo: string
  status: TfdStatusSolicitacao
  urgencia: TfdUrgencia
  especialidade: string
  prestadorNome: string
  prestadorCidade: string
  prestadorEstado: string
  tipoAtendimento: string
  criadoEm: string
  decididoEm: string | null
  canceladoEm: string | null
  atualizadoEm: string
}

const solicitacaoExportSelect = {
  status: true,
  urgencia: true,
  tipo_atendimento: true,
  created_at: true,
  decidido_at: true,
  cancelado_at: true,
  updated_at: true,
  especialidade: { select: { nome: true } },
  prestador: { select: { nome: true, cidade: true, estado: true } },
  processo: { select: { protocolo: true } },
} as const

/**
 * Lista solicitações da fila sem paginação — uso exclusivo da exportação CSV.
 * Não altera `getSolicitacoesTfd` (leitura paginada sem audit EXPORT).
 */
export async function getSolicitacoesCompleto(
  rawFiltros: unknown
): Promise<{ items: SolicitacaoExportRow[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const parsed = exportSolicitacoesCsvSchema.safeParse(rawFiltros)
  if (!parsed.success) {
    throw new ListagemExportError('Filtros de exportação da fila inválidos.')
  }

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const { status, urgencia, protocolo } = parsed.data
  const protocoloBusca = protocolo?.trim()

  const whereClause = {
    tenant_id: tenantId,
    ...(protocoloBusca
      ? {
          processo: {
            protocolo: {
              contains: protocoloBusca,
              mode: 'insensitive' as const,
            },
          },
        }
      : {}),
    ...(status ? { status } : {}),
    ...(urgencia ? { urgencia } : {}),
  }

  const total = await db.tfdSolicitacao.count({ where: whereClause })
  assertListagemExportWithinLimit(total, 'solicitações')

  const rows = await db.tfdSolicitacao.findMany({
    where: whereClause,
    select: solicitacaoExportSelect,
    orderBy: { created_at: 'desc' },
  })

  const items: SolicitacaoExportRow[] = rows.map((row) => ({
    protocolo: row.processo.protocolo,
    status: row.status,
    urgencia: row.urgencia,
    especialidade: row.especialidade?.nome ?? '—',
    prestadorNome: row.prestador?.nome ?? '—',
    prestadorCidade: row.prestador?.cidade ?? '—',
    prestadorEstado: row.prestador?.estado ?? '—',
    tipoAtendimento: row.tipo_atendimento,
    criadoEm: row.created_at.toISOString(),
    decididoEm: row.decidido_at?.toISOString() ?? null,
    canceladoEm: row.cancelado_at?.toISOString() ?? null,
    atualizadoEm: row.updated_at.toISOString(),
  }))

  return { items, total }
}
