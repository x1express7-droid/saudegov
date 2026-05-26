import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type { SaldoListItem } from '../types/tfd.types'
import { exportSaldosCsvSchema } from '../validators/exportacao.schema'
import { buildSaldoListItems } from './get-saldos'
import {
  assertListagemExportWithinLimit,
  ListagemExportError,
} from './listagem-export'

const saldoSelect = {
  id: true,
  descricao: true,
  fonte: true,
  valor_total: true,
  competencia_inicio: true,
  competencia_fim: true,
  ativo: true,
  created_at: true,
} as const

/**
 * Lista saldos financeiros sem paginação — uso exclusivo da exportação CSV.
 * Reutiliza agregados de `buildSaldoListItems` (mesma lógica de `getSaldosTfd`).
 */
export async function getSaldosCompleto(
  rawFiltros: unknown
): Promise<{ items: SaldoListItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const parsed = exportSaldosCsvSchema.safeParse(rawFiltros)
  if (!parsed.success) {
    throw new ListagemExportError('Filtros de exportação de saldos inválidos.')
  }

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const incluirInativos = parsed.data.incluirInativos ?? false

  const where = {
    tenant_id: tenantId,
    ...(incluirInativos ? {} : { ativo: true }),
  }

  const total = await db.tfdSaldo.count({ where })
  assertListagemExportWithinLimit(total, 'saldos')

  const rows = await db.tfdSaldo.findMany({
    where,
    select: saldoSelect,
    orderBy: [{ ativo: 'desc' }, { created_at: 'desc' }],
  })

  const items = await buildSaldoListItems(db, tenantId, rows)

  return { items, total }
}
