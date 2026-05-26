import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { PrismaClient } from '@saude/core-db'
import { TFD_PERMISSIONS } from '../permissions'
import type { SaldoListItem, TfdFonteRecursoValor } from '../types/tfd.types'
import { sumValorConsumidoLiquidoPorSaldo } from '../utils/saldo-movimentacao'
import { calcSaldoDisponivel } from '../utils/saldo'

export interface GetSaldosFiltros {
  incluirInativos?: boolean
}

type SaldoRowSelect = {
  id: string
  descricao: string
  fonte: string
  valor_total: { toString(): string } | number
  competencia_inicio: Date
  competencia_fim: Date
  ativo: boolean
  created_at: Date
}

function decimalToNumber(value: SaldoRowSelect['valor_total']): number {
  return typeof value === 'number' ? value : Number(value)
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function buildSaldoListItems(
  db: PrismaClient,
  tenantId: string,
  rows: SaldoRowSelect[]
): Promise<SaldoListItem[]> {
  if (rows.length === 0) {
    return []
  }

  const saldoIds = rows.map((row) => row.id)

  const [reservasAgg, consumidoPorSaldo] = await Promise.all([
    db.tfdReservaSaldo.groupBy({
      by: ['saldo_id'],
      where: {
        tenant_id: tenantId,
        saldo_id: { in: saldoIds },
        status: 'ATIVA',
      },
      _sum: { valor_estimado: true },
    }),
    sumValorConsumidoLiquidoPorSaldo(db, tenantId, saldoIds),
  ])

  const reservadoPorSaldo = new Map(
    reservasAgg.map((item) => [item.saldo_id, Number(item._sum.valor_estimado ?? 0)])
  )

  return rows.map((row) => {
    const valorTotal = decimalToNumber(row.valor_total)
    const valorReservado = reservadoPorSaldo.get(row.id) ?? 0
    const valorUtilizado = consumidoPorSaldo.get(row.id) ?? 0
    const derivados = calcSaldoDisponivel({
      valorTotal,
      valorReservado,
      valorConsumido: valorUtilizado,
    })

    return {
      id: row.id,
      descricao: row.descricao,
      fonte: row.fonte as TfdFonteRecursoValor,
      valorTotal,
      valorReservado,
      valorUtilizado,
      valorDisponivel: derivados.valorDisponivel,
      percentualDisponivel: derivados.percentualDisponivel,
      alertaBaixo: derivados.alertaBaixo,
      competenciaInicio: formatDateOnly(row.competencia_inicio),
      competenciaFim: formatDateOnly(row.competencia_fim),
      ativo: row.ativo,
      createdAt: row.created_at.toISOString(),
    }
  })
}

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

/** Carrega um saldo com agregados e campos derivados; usado também pelo extrato. */
export async function getSaldoListItemById(
  db: PrismaClient,
  tenantId: string,
  saldoId: string
): Promise<SaldoListItem | null> {
  const row = await db.tfdSaldo.findFirst({
    where: { id: saldoId, tenant_id: tenantId },
    select: saldoSelect,
  })

  if (!row) {
    return null
  }

  const [item] = await buildSaldoListItems(db, tenantId, [row])
  return item ?? null
}

export async function getSaldosTfd(
  filtros: GetSaldosFiltros = {}
): Promise<SaldoListItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const where = {
    tenant_id: tenantId,
    ...(filtros.incluirInativos ? {} : { ativo: true }),
  }

  const rows = await db.tfdSaldo.findMany({
    where,
    select: saldoSelect,
    orderBy: [{ ativo: 'desc' }, { created_at: 'desc' }],
  })

  return buildSaldoListItems(db, tenantId, rows)
}
