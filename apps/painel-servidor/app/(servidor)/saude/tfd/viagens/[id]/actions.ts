'use server'

import { getAgendamentosDisponiveisParaViagem } from '@saude/mod-saude-tfd'
import type { AgendamentoDisponivelViagemItem } from '@saude/mod-saude-tfd/client'

export async function buscarAgendamentosDisponiveisViagemDetalheAction(
  processoId: string,
  viagemId: string
): Promise<AgendamentoDisponivelViagemItem[]> {
  return getAgendamentosDisponiveisParaViagem(processoId, { viagemId })
}
