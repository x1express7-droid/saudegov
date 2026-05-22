import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdReservaStatus } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import type { RelatorioCompetenciaData, RelatorioCompetenciaInput } from '../types/tfd.types'

const RESERVA_STATUS_CONTABILIZADOS: TfdReservaStatus[] = ['ATIVA', 'CONSUMIDA']

function competenciaRangeUtc(mes: number, ano: number): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(Date.UTC(ano, mes - 1, 1)),
    fim: new Date(Date.UTC(ano, mes, 1)),
  }
}

function recordFromGroupBy(
  rows: Array<{ status: string; _count: { _all: number } }>
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const row of rows) {
    result[row.status] = row._count._all
  }
  return result
}

/**
 * Agrega solicitações da competência (mês/ano) para relatório PDF.
 * Sem CID, diagnóstico ou laudo.
 */
export async function getRelatorioCompetenciaTfd(
  input: RelatorioCompetenciaInput
): Promise<RelatorioCompetenciaData> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const { inicio, fim } = competenciaRangeUtc(input.mes, input.ano)

  const filtroCompetencia = {
    tenant_id: tenantId,
    created_at: { gte: inicio, lt: fim },
    status: { not: 'RASCUNHO' as const },
  }

  const [porStatusRows, solicitacoes] = await Promise.all([
    db.tfdSolicitacao.groupBy({
      by: ['status'],
      where: filtroCompetencia,
      _count: { _all: true },
    }),
    db.tfdSolicitacao.findMany({
      where: filtroCompetencia,
      select: {
        id: true,
        status: true,
        processo: { select: { protocolo: true } },
        reservas: {
          where: { status: { in: RESERVA_STATUS_CONTABILIZADOS } },
          select: { valor_estimado: true },
        },
      },
      orderBy: { created_at: 'asc' },
    }),
  ])

  const solicitacaoIds = solicitacoes.map((row) => row.id)

  const consumosAgg =
    solicitacaoIds.length === 0
      ? []
      : await db.tfdMovimentacaoSaldo.groupBy({
          by: ['solicitacao_id'],
          where: {
            tenant_id: tenantId,
            solicitacao_id: { in: solicitacaoIds },
            tipo: 'CONSUMO',
          },
          _sum: { valor: true },
        })

  const consumoPorSolicitacao = new Map(
    consumosAgg.map((row) => [row.solicitacao_id, Number(row._sum.valor ?? 0)])
  )

  let valorTotalReservado = 0
  let valorTotalConsumido = 0

  const itens = solicitacoes.map((row) => {
    const valorReservado = row.reservas.reduce(
      (acc, reserva) => acc + Number(reserva.valor_estimado),
      0
    )
    const valorConsumido = consumoPorSolicitacao.get(row.id) ?? 0
    valorTotalReservado += valorReservado
    valorTotalConsumido += valorConsumido

    return {
      protocolo: row.processo.protocolo,
      status: row.status,
      valorReservado,
      valorConsumido,
    }
  })

  return {
    mes: input.mes,
    ano: input.ano,
    porStatus: recordFromGroupBy(porStatusRows),
    valorTotalReservado,
    valorTotalConsumido,
    itens,
  }
}
