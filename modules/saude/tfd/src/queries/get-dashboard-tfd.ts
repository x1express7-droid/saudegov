import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdStatusSolicitacao, TfdUrgencia } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import type { TfdDashboardOutput } from '../types/tfd.types'
import { loadDashboardSaldos } from './dashboard-saldos-shared'

const MS_POR_DIA = 24 * 60 * 60 * 1000

const STATUS_APROVADOS: TfdStatusSolicitacao[] = [
  'APROVADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
]

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
    db.tfdViagemLegado.count({
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
