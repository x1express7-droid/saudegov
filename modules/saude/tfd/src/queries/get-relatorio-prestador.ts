import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type {
  RelatorioPrestadorData,
  RelatorioPrestadorDetalheItem,
  RelatorioPrestadorGrupoItem,
  RelatorioPrestadorInput,
} from '../types/tfd.types'
import { periodoRangeUtc } from '../utils/relatorio-period'
import {
  calcValoresPorSolicitacao,
  RESERVA_STATUS_CONTABILIZADOS,
} from '../utils/relatorio-valores'

/**
 * Agrega solicitações por prestador no período (volume e valores).
 * Sem CID, diagnóstico ou dados de paciente.
 */
export async function getRelatorioPrestadorTfd(
  input: RelatorioPrestadorInput
): Promise<RelatorioPrestadorData> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const { inicio, fim } = periodoRangeUtc(input.dataInicio, input.dataFim)

  const solicitacoes = await db.tfdSolicitacao.findMany({
    where: {
      tenant_id: tenantId,
      prestador_id: { not: null },
      created_at: { gte: inicio, lte: fim },
      status: { not: 'RASCUNHO' },
      ...(input.prestadorId ? { prestador_id: input.prestadorId } : {}),
    },
    select: {
      id: true,
      status: true,
      protocolo: true,
      prestador_id: true,
      prestador: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          estado: true,
        },
      },
      reservas: {
        where: { status: { in: RESERVA_STATUS_CONTABILIZADOS } },
        select: { valor_estimado: true },
      },
    },
    orderBy: [{ prestador: { nome: 'asc' } }, { created_at: 'asc' }],
  })

  const valoresPorSolicitacao = await calcValoresPorSolicitacao(db, tenantId, solicitacoes)

  const gruposMap = new Map<string, RelatorioPrestadorGrupoItem>()
  const detalhes: RelatorioPrestadorDetalheItem[] = []
  let valorTotalReservado = 0
  let valorTotalConsumido = 0

  for (const row of solicitacoes) {
    if (!row.prestador_id || !row.prestador) {
      continue
    }

    const valores = valoresPorSolicitacao.get(row.id) ?? {
      valorReservado: 0,
      valorConsumido: 0,
    }
    valorTotalReservado += valores.valorReservado
    valorTotalConsumido += valores.valorConsumido

    const existente = gruposMap.get(row.prestador_id)
    if (existente) {
      existente.volume += 1
      existente.valorReservado += valores.valorReservado
      existente.valorConsumido += valores.valorConsumido
    } else {
      gruposMap.set(row.prestador_id, {
        prestadorId: row.prestador.id,
        prestadorNome: row.prestador.nome,
        cidade: row.prestador.cidade,
        estado: row.prestador.estado,
        volume: 1,
        valorReservado: valores.valorReservado,
        valorConsumido: valores.valorConsumido,
      })
    }

    detalhes.push({
      prestadorNome: row.prestador.nome,
      protocolo: row.protocolo,
      status: row.status,
      valorReservado: valores.valorReservado,
      valorConsumido: valores.valorConsumido,
    })
  }

  const grupos = [...gruposMap.values()].sort((a, b) =>
    a.prestadorNome.localeCompare(b.prestadorNome, 'pt-BR')
  )

  return {
    dataInicio: input.dataInicio,
    dataFim: input.dataFim,
    grupos,
    detalhes,
    valorTotalReservado,
    valorTotalConsumido,
  }
}
