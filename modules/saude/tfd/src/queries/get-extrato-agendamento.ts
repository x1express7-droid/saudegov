import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { buscarItensDespesaDoAgendamento } from '../utils/itens-despesa-agendamento'

export interface ExtratoAgendamentoOutput {
  valorEstimado: number | null
  valorRealTotal: number
  itensPorSegmento: Array<{
    sequencia: number
    tipoSegmento: string | null
    origemDescricao: string | null
    destinoDescricao: string | null
    subtotal: number
  }>
}

export async function getExtratoAgendamento(
  agendamentoId: string
): Promise<ExtratoAgendamentoOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const agendamento = await db.tfdAgendamento.findFirst({
    where: {
      id: agendamentoId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      solicitacao_id: true,
    },
  })

  if (!agendamento) {
    return null
  }

  const [reserva, transportes, itensRows] = await Promise.all([
    db.tfdReservaSaldo.findFirst({
      where: {
        tenant_id: tenantId,
        solicitacao_id: agendamento.solicitacao_id,
        status: 'ATIVA',
      },
      select: { valor_estimado: true },
    }),
    db.tfdTransporte.findMany({
      where: {
        tenant_id: tenantId,
        agendamento_id: agendamentoId,
      },
      select: {
        id: true,
        sequencia: true,
        tipo_segmento: true,
        origem_descricao: true,
        destino_descricao: true,
      },
      orderBy: { sequencia: 'asc' },
    }),
    buscarItensDespesaDoAgendamento(db, tenantId, agendamentoId),
  ])

  const transportePorId = new Map(transportes.map((row) => [row.id, row]))

  const subtotaisPorChave = new Map<
    string,
    {
      sequencia: number
      tipoSegmento: string | null
      origemDescricao: string | null
      destinoDescricao: string | null
      subtotal: number
    }
  >()

  const chaveAvulsa = 'avulsa'

  for (const item of itensRows) {
    const valor = Number(item.valor)

    if (item.transporte_id) {
      const transporte = transportePorId.get(item.transporte_id)
      const chave = item.transporte_id
      const existente = subtotaisPorChave.get(chave)

      if (existente) {
        existente.subtotal += valor
      } else {
        subtotaisPorChave.set(chave, {
          sequencia: transporte?.sequencia ?? 0,
          tipoSegmento: transporte?.tipo_segmento ?? null,
          origemDescricao: transporte?.origem_descricao ?? null,
          destinoDescricao: transporte?.destino_descricao ?? null,
          subtotal: valor,
        })
      }
      continue
    }

    const existenteAvulsa = subtotaisPorChave.get(chaveAvulsa)
    if (existenteAvulsa) {
      existenteAvulsa.subtotal += valor
    } else {
      subtotaisPorChave.set(chaveAvulsa, {
        sequencia: 0,
        tipoSegmento: null,
        origemDescricao: null,
        destinoDescricao: null,
        subtotal: valor,
      })
    }
  }

  for (const transporte of transportes) {
    if (!subtotaisPorChave.has(transporte.id)) {
      subtotaisPorChave.set(transporte.id, {
        sequencia: transporte.sequencia,
        tipoSegmento: transporte.tipo_segmento,
        origemDescricao: transporte.origem_descricao,
        destinoDescricao: transporte.destino_descricao,
        subtotal: 0,
      })
    }
  }

  const itensPorSegmento = [...subtotaisPorChave.values()].sort(
    (a, b) => a.sequencia - b.sequencia
  )

  const valorRealTotal = itensRows.reduce((acc, item) => acc + Number(item.valor), 0)

  return {
    valorEstimado: reserva ? Number(reserva.valor_estimado) : null,
    valorRealTotal,
    itensPorSegmento,
  }
}
