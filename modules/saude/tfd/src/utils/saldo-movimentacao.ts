import type { Prisma, PrismaClient, TfdMovimentacaoTipo } from '@prisma/client'

type SaldoMovimentacaoDb = PrismaClient | Prisma.TransactionClient

/**
 * Tipos de movimentação que podem ser corrigidos via ESTORNO (§1.8).
 * RESERVA não entra — efeito financeiro está em reservas_saldo.
 * ESTORNO não estorna outro ESTORNO.
 */
export const TIPOS_MOVIMENTACAO_ESTORNAVEIS: readonly TfdMovimentacaoTipo[] = [
  'CONSUMO',
  'CREDITO',
  'LIBERACAO',
]

export function isTipoMovimentacaoEstornavel(tipo: TfdMovimentacaoTipo): boolean {
  return (TIPOS_MOVIMENTACAO_ESTORNAVEIS as readonly string[]).includes(tipo)
}

/**
 * Incremento no "valor consumido" usado em calcSaldoDisponivel para um ESTORNO
 * (valor do estorno = oposto ao da movimentação original).
 */
export function calcIncrementoConsumidoPorEstorno(
  tipoOriginal: TfdMovimentacaoTipo,
  valorEstorno: number
): number {
  switch (tipoOriginal) {
    case 'CONSUMO':
      return valorEstorno
    case 'CREDITO':
    case 'LIBERACAO':
      return -valorEstorno
    default:
      return 0
  }
}

function decimalToNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value)
}

/**
 * Soma líquida que reduz o saldo disponível por saldo:
 * CONSUMO + impacto dos ESTORNOs sobre movimentações estornáveis.
 * @see BUSINESS_RULES.md §1.8
 */
export async function sumValorConsumidoLiquidoPorSaldo(
  db: SaldoMovimentacaoDb,
  tenantId: string,
  saldoIds: string[]
): Promise<Map<string, number>> {
  const resultado = new Map<string, number>()

  if (saldoIds.length === 0) {
    return resultado
  }

  for (const id of saldoIds) {
    resultado.set(id, 0)
  }

  const [consumosAgg, estornos] = await Promise.all([
    db.tfdMovimentacaoSaldo.groupBy({
      by: ['saldo_id'],
      where: {
        tenant_id: tenantId,
        saldo_id: { in: saldoIds },
        tipo: 'CONSUMO',
      },
      _sum: { valor: true },
    }),
    db.tfdMovimentacaoSaldo.findMany({
      where: {
        tenant_id: tenantId,
        saldo_id: { in: saldoIds },
        tipo: 'ESTORNO',
        movimentacao_origem_id: { not: null },
      },
      select: {
        saldo_id: true,
        valor: true,
        movimentacao_origem: {
          select: { tipo: true },
        },
      },
    }),
  ])

  for (const row of consumosAgg) {
    resultado.set(row.saldo_id, Number(row._sum.valor ?? 0))
  }

  for (const estorno of estornos) {
    const tipoOriginal = estorno.movimentacao_origem?.tipo
    if (!tipoOriginal || !isTipoMovimentacaoEstornavel(tipoOriginal)) {
      continue
    }

    const atual = resultado.get(estorno.saldo_id) ?? 0
    const incremento = calcIncrementoConsumidoPorEstorno(
      tipoOriginal,
      decimalToNumber(estorno.valor)
    )
    resultado.set(estorno.saldo_id, atual + incremento)
  }

  return resultado
}

/** Agregado para um único saldo (decisão, notificação). */
export async function sumValorConsumidoLiquido(
  db: SaldoMovimentacaoDb,
  tenantId: string,
  saldoId: string
): Promise<number> {
  const map = await sumValorConsumidoLiquidoPorSaldo(db, tenantId, [saldoId])
  return map.get(saldoId) ?? 0
}
