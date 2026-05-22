import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { PrismaClient } from '@saude/core-db'
import type { TfdStatusSolicitacao, TfdUrgencia } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import type { TfdDashboardOutput, TfdDashboardSaldoItem, TfdFonteRecursoValor } from '../types/tfd.types'
import { calcSaldoDisponivel } from '../utils/saldo'

const MS_POR_DIA = 24 * 60 * 60 * 1000

const STATUS_APROVADOS: TfdStatusSolicitacao[] = [
  'APROVADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
]

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

function startOfCurrentMonthUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function todayUtcDateOnly(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_POR_DIA)
}

function recordFromGroupBy<T extends string>(
  rows: Array<{ [K in T]: string } & { _count: { _all: number } }>,
  key: T
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const row of rows) {
    result[row[key]] = row._count._all
  }
  return result
}

function calcTempoMedioAprovacaoDias(
  rows: Array<{ created_at: Date; decidido_at: Date | null }>
): number {
  const durations: number[] = []

  for (const row of rows) {
    if (!row.decidido_at) {
      continue
    }
    const diffMs = row.decidido_at.getTime() - row.created_at.getTime()
    if (diffMs >= 0) {
      durations.push(diffMs / MS_POR_DIA)
    }
  }

  if (durations.length === 0) {
    return 0
  }

  const media = durations.reduce((acc, value) => acc + value, 0) / durations.length
  return Math.round(media * 10) / 10
}

async function loadDashboardSaldos(
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

  const [reservasAgg, consumosAgg] = await Promise.all([
    db.tfdReservaSaldo.groupBy({
      by: ['saldo_id'],
      where: {
        tenant_id: tenantId,
        saldo_id: { in: saldoIds },
        status: 'ATIVA',
      },
      _sum: { valor_estimado: true },
    }),
    db.tfdMovimentacaoSaldo.groupBy({
      by: ['saldo_id'],
      where: {
        tenant_id: tenantId,
        saldo_id: { in: saldoIds },
        tipo: 'CONSUMO',
      },
      _sum: { valor: true },
    }),
  ])

  const reservadoPorSaldo = new Map(
    reservasAgg.map((item) => [item.saldo_id, Number(item._sum.valor_estimado ?? 0)])
  )
  const consumidoPorSaldo = new Map(
    consumosAgg.map((item) => [item.saldo_id, Number(item._sum.valor ?? 0)])
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
      alertaBaixo: derivados.alertaBaixo,
    }
  })
}

/**
 * KPIs e agregados do dashboard TFD do gestor.
 * @see docs/API_CONTRACTS.md §7.3
 */
export async function getDashboardTfd(): Promise<TfdDashboardOutput> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.VER_DASHBOARD)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const inicioMes = startOfCurrentMonthUtc()
  const hoje = todayUtcDateOnly()
  const fimJanela7Dias = addDaysUtc(hoje, 7)

  const filtroMes = {
    tenant_id: tenantId,
    created_at: { gte: inicioMes },
    status: { not: 'RASCUNHO' as const },
  }

  const [
    totalSolicitacoes,
    porStatusRows,
    porUrgenciaRows,
    aprovacaoRows,
    prestacoesPendentes,
    viagensProximos7Dias,
    saldos,
  ] = await Promise.all([
    db.tfdSolicitacao.count({ where: filtroMes }),
    db.tfdSolicitacao.groupBy({
      by: ['status'],
      where: filtroMes,
      _count: { _all: true },
    }),
    db.tfdSolicitacao.groupBy({
      by: ['urgencia'],
      where: filtroMes,
      _count: { _all: true },
    }),
    db.tfdSolicitacao.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: STATUS_APROVADOS },
        decidido_at: { not: null },
      },
      select: {
        created_at: true,
        decidido_at: true,
      },
    }),
    db.tfdPrestacaoConta.count({
      where: {
        tenant_id: tenantId,
        status: 'PENDENTE',
        viagem: {
          solicitacao: {
            tenant_id: tenantId,
            status: 'AGUARDANDO_PC',
          },
        },
      },
    }),
    db.tfdViagem.count({
      where: {
        tenant_id: tenantId,
        status: 'AGENDADA',
        data_viagem: {
          gte: hoje,
          lte: fimJanela7Dias,
        },
      },
    }),
    loadDashboardSaldos(db, tenantId),
  ])

  return {
    totalSolicitacoes,
    porStatus: recordFromGroupBy(porStatusRows, 'status'),
    porUrgencia: recordFromGroupBy(porUrgenciaRows, 'urgencia') as Record<TfdUrgencia, number>,
    tempoMedioAprovacaoDias: calcTempoMedioAprovacaoDias(aprovacaoRows),
    prestacoesPendentes,
    viagensProximos7Dias,
    saldos,
  }
}
