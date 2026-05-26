import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { TFD_PERMISSIONS } from '../permissions'
import { filtrosExtratoSchema } from '../validators/financeiro.schema'
import type { ExtratoMovimentacaoItem, SaldoListItem } from '../types/tfd.types'
import { getSaldoListItemById } from './get-saldos'
import {
  buildWhereMovimentacoesExtrato,
  mapMovimentacoesToExtratoItems,
  movimentacaoSelect,
} from './get-extrato-shared'

export class ExtratoSaldoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExtratoSaldoError'
  }
}

export interface GetExtratoSaldoResult {
  items: ExtratoMovimentacaoItem[]
  total: number
  saldo: SaldoListItem
}

export async function getExtratoSaldo(
  rawFiltros: unknown
): Promise<GetExtratoSaldoResult> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const parsed = filtrosExtratoSchema.safeParse(rawFiltros)
  if (!parsed.success) {
    throw new ExtratoSaldoError('Filtros de extrato inválidos.')
  }

  const { saldoId, dataInicio, dataFim, page = 1, perPage = 20 } = parsed.data
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

  const [movimentacoes, total] = await Promise.all([
    db.tfdMovimentacaoSaldo.findMany({
      where: whereMovimentacoes,
      select: movimentacaoSelect,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdMovimentacaoSaldo.count({ where: whereMovimentacoes }),
  ])

  const items = await mapMovimentacoesToExtratoItems(db, tenantId, movimentacoes)

  return { items, total, saldo }
}
