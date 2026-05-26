import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdPrestacaoStatus } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import { exportPrestacoesCsvSchema } from '../validators/exportacao.schema'
import {
  assertListagemExportWithinLimit,
  ListagemExportError,
} from './listagem-export'

export interface PrestacaoExportRow {
  protocolo: string
  status: TfdPrestacaoStatus
  valorTotal: number
  enviadoEm: string | null
  aprovadoEm: string | null
}

const prestacaoExportSelect = {
  status: true,
  updated_at: true,
  aprovado_at: true,
  viagem: {
    select: {
      itens_despesa: { select: { valor: true } },
      solicitacao: {
        select: {
          processo: { select: { protocolo: true } },
        },
      },
    },
  },
} as const

const STATUS_COM_ENVIO = new Set<TfdPrestacaoStatus>(['ENVIADA', 'APROVADA', 'REJEITADA'])

/**
 * Lista prestações de contas sem paginação — uso exclusivo da exportação CSV.
 */
export async function getPrestacoesCompleto(
  rawFiltros: unknown
): Promise<{ items: PrestacaoExportRow[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const parsed = exportPrestacoesCsvSchema.safeParse(rawFiltros)
  if (!parsed.success) {
    throw new ListagemExportError('Filtros de exportação de prestações inválidos.')
  }

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const { status } = parsed.data

  const whereClause = {
    tenant_id: tenantId,
    ...(status ? { status } : {}),
  }

  const total = await db.tfdPrestacaoConta.count({ where: whereClause })
  assertListagemExportWithinLimit(total, 'prestações de contas')

  const rows = await db.tfdPrestacaoConta.findMany({
    where: whereClause,
    select: prestacaoExportSelect,
    orderBy: { prazo_envio_at: 'asc' },
  })

  const items: PrestacaoExportRow[] = rows.map((row) => {
    const valorTotal = row.viagem.itens_despesa.reduce((acc, item) => acc + Number(item.valor), 0)
    const enviadoEm =
      STATUS_COM_ENVIO.has(row.status) ? row.updated_at.toISOString() : null

    return {
      protocolo: row.viagem.solicitacao.processo.protocolo,
      status: row.status,
      valorTotal,
      enviadoEm,
      aprovadoEm: row.aprovado_at?.toISOString() ?? null,
    }
  })

  return { items, total }
}
