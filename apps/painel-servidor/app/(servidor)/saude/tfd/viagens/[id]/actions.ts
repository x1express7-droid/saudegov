'use server'

import { getAgendamentosDisponiveisParaViagem } from '@saude/mod-saude-tfd'
import type { AgendamentoDisponivelViagemItem } from '@saude/mod-saude-tfd/client'

export async function buscarAgendamentosDisponiveisViagemDetalheAction(
  processoId: string,
  dataSaida: string
): Promise<AgendamentoDisponivelViagemItem[]> {
  return getAgendamentosDisponiveisParaViagem(processoId, dataSaida)
}
