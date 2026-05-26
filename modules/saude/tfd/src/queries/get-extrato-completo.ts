import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { TFD_PERMISSIONS } from '../permissions'
import { filtrosExtratoExportSchema } from '../validators/financeiro.schema'
import type { ExtratoMovimentacaoItem, SaldoListItem } from '../types/tfd.types'
import { getSaldoListItemById } from './get-saldos'
import {
  buildWhereMovimentacoesExtrato,
  mapMovimentacoesToExtratoItems,
  movimentacaoSelect,
} from './get-extrato-shared'
import { ExtratoSaldoError } from './get-extrato'

/** Limite de segurança para exportação CSV do extrato completo. */
export const EXTRATO_EXPORT_MAX_REGISTROS = 50_000

export interface GetExtratoSaldoCompletoResult {
  items: ExtratoMovimentacaoItem[]
  total: number
  saldo: SaldoListItem
}

/**
 * Lista todas as movimentações do saldo no período (sem paginação).
 * Uso exclusivo da exportação CSV — não altera a leitura paginada de `getExtratoSaldo`.
 */
export async function getExtratoSaldoCompleto(
  rawFiltros: unknown
): Promise<GetExtratoSaldoCompletoResult> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const parsed = filtrosExtratoExportSchema.safeParse(rawFiltros)
  if (!parsed.success) {
    throw new ExtratoSaldoError('Filtros de extrato inválidos.')
  }

  const { saldoId, dataInicio, dataFim } = parsed.data
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const saldo = await getSaldoListItemById(db, tenantId, saldoId)
  if (!saldo) {
    throw new ExtratoSaldoError('Saldo não encontrado.')
  }

  const whereMovimentacoes = buildWhereMovimentacoesExtrato({
    tenantId,
    saldoId,
    dataInicio,
    dataFim,
  })

  const total = await db.tfdMovimentacaoSaldo.count({ where: whereMovimentacoes })

  if (total > EXTRATO_EXPORT_MAX_REGISTROS) {
    throw new ExtratoSaldoError(
      `O período selecionado possui ${total.toLocaleString('pt-BR')} movimentações. Refine o intervalo de datas (máximo ${EXTRATO_EXPORT_MAX_REGISTROS.toLocaleString('pt-BR')} por exportação).`
    )
  }

  const movimentacoes = await db.tfdMovimentacaoSaldo.findMany({
    where: whereMovimentacoes,
    select: movimentacaoSelect,
    orderBy: { created_at: 'desc' },
  })

  const items = await mapMovimentacoesToExtratoItems(db, tenantId, movimentacoes)

  return { items, total, saldo }
}
