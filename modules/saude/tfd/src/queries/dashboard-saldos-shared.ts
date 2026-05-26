import type { PrismaClient } from '@saude/core-db'

import type { TfdDashboardSaldoItem, TfdFonteRecursoValor } from '../types/tfd.types'
import { sumValorConsumidoLiquidoPorSaldo } from '../utils/saldo-movimentacao'
import { calcSaldoDisponivel } from '../utils/saldo'

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

/** Saldos ativos com disponível e alerta — reutilizado no dashboard gestor. */
export async function loadDashboardSaldos(
  db: PrismaClient,
  tenantId: string
): Promise<TfdDashboardSaldoItem[]> {
  const rows = await db.tfdSaldo.findMany({
    where: { tenant_id: tenantId, ativo: true },
    select: saldoSelect,
    orderBy: { created_at: 'desc' },
  })

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
    }
  })
}
