'use server'

import {
  getAgendamentosDisponiveisParaViagem,
  getListaProcessosTfd,
  getMotoristasAgendamentoTfd,
} from '@saude/mod-saude-tfd'
import type {
  AgendamentoDisponivelViagemItem,
  ProcessoTfdListItem,
  TfdMotoristaAgendamentoItem,
} from '@saude/mod-saude-tfd/client'

export interface ProcessoViagemOption {
  value: string
  label: string
}

export async function buscarProcessosParaViagemAction(
  query: string
): Promise<ProcessoViagemOption[]> {
  const trimmed = query.trim()
  const { items } = await getListaProcessosTfd({
    protocolo: trimmed || undefined,
    pacienteNome: trimmed || undefined,
    perPage: 50,
    page: 1,
  })

  return items.map(mapProcessoOption)
}

export async function buscarProcessoPorIdAction(
  processoId: string
): Promise<ProcessoViagemOption | null> {
  const { items } = await getListaProcessosTfd({ perPage: 100, page: 1 })
  const found = items.find((item) => item.processoId === processoId)
  return found ? mapProcessoOption(found) : null
}

export async function buscarAgendamentosDisponiveisViagemAction(
  processoId: string,
  dataSaida?: string
): Promise<AgendamentoDisponivelViagemItem[]> {
  if (!processoId) {
    return []
  }
  return getAgendamentosDisponiveisParaViagem(processoId, { dataSaida })
}

export async function buscarMotoristasViagemAction(
  dataSaida: string
): Promise<TfdMotoristaAgendamentoItem[]> {
  if (!dataSaida) {
    return []
  }
  return getMotoristasAgendamentoTfd(dataSaida)
}

function mapProcessoOption(item: ProcessoTfdListItem): ProcessoViagemOption {
  const paciente = item.paciente?.nome ?? 'Sem paciente'
  return {
    value: item.processoId,
    label: `${item.protocolo} — ${paciente}`,
  }
}
