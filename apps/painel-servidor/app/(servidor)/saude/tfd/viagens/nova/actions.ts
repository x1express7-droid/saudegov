'use server'

import { requireTenantRole } from '@saude/core-auth/server'
import {
  getAgendamentosDisponiveisParaViagem,
  getMotoristasAgendamentoTfd,
} from '@saude/mod-saude-tfd'
import type {
  AgendamentoDisponivelViagemItem,
  TfdMotoristaAgendamentoItem,
} from '@saude/mod-saude-tfd/client'

// REMOVE-PROCESSO-PARTE-4: busca por data de saída (e destino reservado)
export async function buscarAgendamentosDisponiveisViagemAction(
  dataSaida?: string,
  destinoDescricao?: string,
  viagemId?: string
): Promise<AgendamentoDisponivelViagemItem[]> {
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  return getAgendamentosDisponiveisParaViagem(tenantId, {
    dataSaida,
    destinoDescricao,
    viagemId,
  })
}

export async function buscarMotoristasViagemAction(
  dataSaida: string
): Promise<TfdMotoristaAgendamentoItem[]> {
  if (!dataSaida) {
    return []
  }
  return getMotoristasAgendamentoTfd(dataSaida)
}
