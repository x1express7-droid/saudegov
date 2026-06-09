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

function parseDataUtc(data: string): Date {
  const [year, month, day] = data.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

function addDaysUtc(data: Date, dias: number): Date {
  const result = new Date(data)
  result.setUTCDate(result.getUTCDate() + dias)
  return result
}

function janelaDataConsulta(dataConsulta: string): { inicio: string; fim: string } {
  const referencia = parseDataUtc(dataConsulta)
  return {
    inicio: addDaysUtc(referencia, -3).toISOString().slice(0, 10),
    fim: addDaysUtc(referencia, 3).toISOString().slice(0, 10),
  }
}

// REMOVE-PROCESSO-PARTE-3: viagens elegíveis por data da consulta, não por processo
export async function buscarViagensParaVincularAgendamentoAction(
  dataConsulta: string,
  viagemIdsJaVinculadas: string[] = []
): Promise<ViagemParaVincularItem[]> {
  const { inicio, fim } = janelaDataConsulta(dataConsulta)
  const { items } = await getViagensTfd({
    dataSaidaInicio: inicio,
    dataSaidaFim: fim,
    perPage: 100,
    page: 1,
  })
  const vinculadasSet = new Set(viagemIdsJaVinculadas)

  const elegiveis = items.filter(
    (viagem) =>
      STATUS_ELEGIVEIS.includes(viagem.status) && !vinculadasSet.has(viagem.id)
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
