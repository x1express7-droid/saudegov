'use server'

import { requireTenantRole } from '@saude/core-auth/server'
import { getAgendamentosDisponiveisParaViagem } from '@saude/mod-saude-tfd'
import type { AgendamentoDisponivelViagemItem } from '@saude/mod-saude-tfd/client'

// REMOVE-PROCESSO-PARTE-4: busca por data/destino da viagem
export async function buscarAgendamentosDisponiveisViagemDetalheAction(
  viagemId: string,
  dataSaida?: string,
  destinoDescricao?: string
): Promise<AgendamentoDisponivelViagemItem[]> {
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  return getAgendamentosDisponiveisParaViagem(tenantId, {
    dataSaida,
    destinoDescricao,
    viagemId,
  })
}
