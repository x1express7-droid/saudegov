'use server'

import { getVagasViagem, getViagensTfd } from '@saude/mod-saude-tfd'
import type { TfdViagemStatusV2 } from '@prisma/client'

const STATUS_ELEGIVEIS: TfdViagemStatusV2[] = ['PLANEJADA', 'CONFIRMADA']

export interface ViagemParaVincularItem {
  id: string
  protocolo: string
  status: TfdViagemStatusV2
  dataSaida: string
  origemDescricao: string
  destinoDescricao: string
  vagasOcupadas: number
  vagasDisponiveis: number | null
  capacidadeVeiculo: number | null
}

export async function buscarViagensParaVincularAgendamentoAction(
  processoId: string,
  viagemIdsJaVinculadas: string[] = []
): Promise<ViagemParaVincularItem[]> {
  const { items } = await getViagensTfd({ processoId, perPage: 100, page: 1 })
  const vinculadasSet = new Set(viagemIdsJaVinculadas)

  const elegiveis = items.filter(
    (viagem) => STATUS_ELEGIVEIS.includes(viagem.status) && !vinculadasSet.has(viagem.id)
  )

  const viagensComVagas: ViagemParaVincularItem[] = []

  for (const viagem of elegiveis) {
    const vagas = await getVagasViagem(viagem.id)
    viagensComVagas.push({
      id: viagem.id,
      protocolo: viagem.protocolo,
      status: viagem.status,
      dataSaida: viagem.dataSaida,
      origemDescricao: viagem.origemDescricao,
      destinoDescricao: viagem.destinoDescricao,
      vagasOcupadas: vagas?.vagasOcupadas ?? viagem.totalPassageiros,
      vagasDisponiveis: vagas?.vagasDisponiveis ?? null,
      capacidadeVeiculo: vagas?.capacidadeTotal ?? viagem.capacidadeVeiculo,
    })
  }

  return viagensComVagas
}
