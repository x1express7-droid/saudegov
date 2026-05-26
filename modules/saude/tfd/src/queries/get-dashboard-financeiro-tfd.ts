import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type { TfdDashboardFinanceiroOutput } from '../types/tfd.types'
import { loadDashboardSaldos } from './dashboard-saldos-shared'

const EXTRATO_RESUMIDO_LIMITE = 5

/**
 * Bloco financeiro do dashboard gestor TFD — KPI consolidado, alertas e extrato resumido.
 * @see docs/SPRINTS.md Sprint 2.2
 */
export async function getDashboardFinanceiroTfd(): Promise<TfdDashboardFinanceiroOutput> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.VER_DASHBOARD)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const saldosAtivos = await loadDashboardSaldos(db, tenantId)

  const totalDisponivelConsolidado = saldosAtivos.reduce(
    (acc, saldo) => acc + saldo.valorDisponivel,
    0
  )

  const saldosEmAlerta = saldosAtivos.filter((saldo) => saldo.alertaBaixo)

  if (saldosAtivos.length === 0) {
    return {
      totalDisponivelConsolidado: 0,
      saldosEmAlerta: [],
      extratoResumido: [],
      quantidadeSaldosAtivos: 0,
    }
  }

  const saldoIds = saldosAtivos.map((saldo) => saldo.id)
  const saldoDescricaoPorId = new Map(saldosAtivos.map((saldo) => [saldo.id, saldo.descricao]))

  const movimentacoes = await db.tfdMovimentacaoSaldo.findMany({
    where: {
      tenant_id: tenantId,
      saldo_id: { in: saldoIds },
    },
    select: {
      id: true,
      saldo_id: true,
      tipo: true,
      valor: true,
      descricao: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: EXTRATO_RESUMIDO_LIMITE,
  })

  const extratoResumido = movimentacoes.map((row) => ({
    id: row.id,
    criadoEm: row.created_at.toISOString(),
    tipo: row.tipo,
    descricao: row.descricao,
    valor: Number(row.valor),
    saldoId: row.saldo_id,
    saldoDescricao: saldoDescricaoPorId.get(row.saldo_id) ?? 'Saldo',
  }))

  return {
    totalDisponivelConsolidado,
    saldosEmAlerta,
    extratoResumido,
    quantidadeSaldosAtivos: saldosAtivos.length,
  }
}
