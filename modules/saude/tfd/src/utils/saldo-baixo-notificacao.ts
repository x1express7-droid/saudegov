import type { PrismaClient } from '@saude/core-db'
import { getPrismaForTenant } from '@saude/core-db'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'

import { sumValorConsumidoLiquido } from './saldo-movimentacao'
import { calcSaldoDisponivel } from './saldo'

const MODULO_TFD = 'saude.tfd'

export interface SaldoEstadoAlerta {
  ativo: boolean
  descricao: string
  alertaBaixo: boolean
  percentualDisponivel: number
}

/** Estado atual do saldo para verificação de alerta (saldos inativos retornam `ativo: false`). */
export async function resolveSaldoEstadoAlerta(
  db: PrismaClient,
  tenantId: string,
  saldoId: string
): Promise<SaldoEstadoAlerta | null> {
  const saldo = await db.tfdSaldo.findFirst({
    where: { id: saldoId, tenant_id: tenantId },
    select: {
      id: true,
      descricao: true,
      valor_total: true,
      ativo: true,
    },
  })

  if (!saldo) {
    return null
  }

  const valorTotal = Number(saldo.valor_total)

  const [reservasAgg, valorConsumidoLiquido] = await Promise.all([
    db.tfdReservaSaldo.aggregate({
      where: {
        tenant_id: tenantId,
        saldo_id: saldoId,
        status: 'ATIVA',
      },
      _sum: { valor_estimado: true },
    }),
    sumValorConsumidoLiquido(db, tenantId, saldoId),
  ])

  const derivados = calcSaldoDisponivel({
    valorTotal,
    valorReservado: Number(reservasAgg._sum.valor_estimado ?? 0),
    valorConsumido: valorConsumidoLiquido,
  })

  return {
    ativo: saldo.ativo,
    descricao: saldo.descricao,
    alertaBaixo: derivados.alertaBaixo,
    percentualDisponivel: derivados.percentualDisponivel,
  }
}

/**
 * Dispara `SALDO_BAIXO` apenas na transição para alerta (não estava em alerta antes da mutação).
 * Evita duplicatas sem campo dedicado no schema — ver BUSINESS_RULES.md §1.8 / §1.14.
 */
export async function tryNotificarSaldoBaixoAposMutacao(params: {
  tenantId: string
  saldoId: string
  jaEstavaEmAlertaBaixo: boolean
  excludeUserIds?: string[]
}): Promise<void> {
  if (params.jaEstavaEmAlertaBaixo) {
    return
  }

  const db = await getPrismaForTenant(params.tenantId)
  const estado = await resolveSaldoEstadoAlerta(db, params.tenantId, params.saldoId)

  if (!estado?.ativo || !estado.alertaBaixo) {
    return
  }

  await dispararNotificacao({
    tenantId: params.tenantId,
    evento: NOTIFICATION_EVENTS.SALDO_BAIXO,
    modulo: MODULO_TFD,
    context: {
      nomeSaldo: estado.descricao,
      percentualDisponivel: estado.percentualDisponivel,
    },
    excludeUserIds: params.excludeUserIds,
  })
}
