import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdStatusSolicitacao } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import type {
  RelatorioProducaoMensalData,
  RelatorioProducaoMensalInput,
  RelatorioProducaoStatusChave,
  RelatorioProducaoStatusResumo,
} from '../types/tfd.types'
import { competenciaRangeUtc } from '../utils/relatorio-period'
import {
  calcValoresPorSolicitacao,
  RESERVA_STATUS_CONTABILIZADOS,
} from '../utils/relatorio-valores'

const STATUS_APROVADAS: TfdStatusSolicitacao[] = [
  'APROVADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
]

const solicitacaoSelect = {
  id: true,
  status: true,
  reservas: {
    where: { status: { in: RESERVA_STATUS_CONTABILIZADOS } },
    select: { valor_estimado: true },
  },
} as const

function emptyResumo(): RelatorioProducaoStatusResumo {
  return { quantidade: 0, valorReservado: 0, valorConsumido: 0 }
}

function initPorStatus(): Record<RelatorioProducaoStatusChave, RelatorioProducaoStatusResumo> {
  return {
    APROVADO: emptyResumo(),
    NEGADO: emptyResumo(),
    CONCLUIDO: emptyResumo(),
    CANCELADO: emptyResumo(),
  }
}

/**
 * Produção mensal: aprovadas, negadas, concluídas e canceladas com valores.
 */
export async function getRelatorioProducaoMensalTfd(
  input: RelatorioProducaoMensalInput
): Promise<RelatorioProducaoMensalData> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const { inicio, fim } = competenciaRangeUtc(input.mes, input.ano)

  const [aprovadas, negadas, concluidas, canceladas] = await Promise.all([
    db.tfdSolicitacao.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: STATUS_APROVADAS },
        decidido_at: { gte: inicio, lt: fim },
      },
      select: solicitacaoSelect,
    }),
    db.tfdSolicitacao.findMany({
      where: {
        tenant_id: tenantId,
        status: 'NEGADO',
        decidido_at: { gte: inicio, lt: fim },
      },
      select: solicitacaoSelect,
    }),
    db.tfdSolicitacao.findMany({
      where: {
        tenant_id: tenantId,
        status: 'CONCLUIDO',
        updated_at: { gte: inicio, lt: fim },
      },
      select: solicitacaoSelect,
    }),
    db.tfdSolicitacao.findMany({
      where: {
        tenant_id: tenantId,
        status: 'CANCELADO',
        cancelado_at: { gte: inicio, lt: fim },
      },
      select: solicitacaoSelect,
    }),
  ])

  const porStatus = initPorStatus()
  let valorTotalReservado = 0
  let valorTotalConsumido = 0

  const buckets: Array<{
    chave: RelatorioProducaoStatusChave
    rows: typeof aprovadas
  }> = [
    { chave: 'APROVADO', rows: aprovadas },
    { chave: 'NEGADO', rows: negadas },
    { chave: 'CONCLUIDO', rows: concluidas },
    { chave: 'CANCELADO', rows: canceladas },
  ]

  for (const bucket of buckets) {
    const valoresMap = await calcValoresPorSolicitacao(db, tenantId, bucket.rows)

    for (const row of bucket.rows) {
      const valores = valoresMap.get(row.id) ?? { valorReservado: 0, valorConsumido: 0 }
      porStatus[bucket.chave].quantidade += 1
      porStatus[bucket.chave].valorReservado += valores.valorReservado
      porStatus[bucket.chave].valorConsumido += valores.valorConsumido
      valorTotalReservado += valores.valorReservado
      valorTotalConsumido += valores.valorConsumido
    }
  }

  return {
    mes: input.mes,
    ano: input.ano,
    porStatus,
    valorTotalReservado,
    valorTotalConsumido,
  }
}
