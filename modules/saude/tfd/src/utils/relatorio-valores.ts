import type { getPrismaForTenant } from '@saude/core-db'
import type { TfdReservaStatus } from '@prisma/client'

type TenantDb = Awaited<ReturnType<typeof getPrismaForTenant>>

const RESERVA_STATUS_CONTABILIZADOS: TfdReservaStatus[] = ['ATIVA', 'CONSUMIDA']

type SolicitacaoValoresRow = {
  id: string
  reservas: Array<{ valor_estimado: { toString(): string } | number }>
}

export async function calcValoresPorSolicitacao(
  db: TenantDb,
  tenantId: string,
  solicitacoes: SolicitacaoValoresRow[]
): Promise<Map<string, { valorReservado: number; valorConsumido: number }>> {
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

  const result = new Map<string, { valorReservado: number; valorConsumido: number }>()

  for (const row of solicitacoes) {
    const valorReservado = row.reservas.reduce(
      (acc, reserva) => acc + Number(reserva.valor_estimado),
      0
    )
    const valorConsumido = consumoPorSolicitacao.get(row.id) ?? 0
    result.set(row.id, { valorReservado, valorConsumido })
  }

  return result
}

export function sumReservasSolicitacao(
  reservas: Array<{ valor_estimado: { toString(): string } | number; status: TfdReservaStatus }>
): number {
  return reservas
    .filter((reserva) => RESERVA_STATUS_CONTABILIZADOS.includes(reserva.status))
    .reduce((acc, reserva) => acc + Number(reserva.valor_estimado), 0)
}

export { RESERVA_STATUS_CONTABILIZADOS }
