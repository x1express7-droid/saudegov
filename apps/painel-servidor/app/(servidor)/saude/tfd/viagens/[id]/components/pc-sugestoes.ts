import type { SegmentoViagemItem, ViagemDetalheOutput } from '@saude/mod-saude-tfd/client'
import type { TfdTipoDespesaConfigKey } from '@saude/ui'
import { TFD_TIPO_DESPESA_CONFIG } from '@saude/ui'

// PC-PARTE-4: sugestões automáticas de itens na PC (cálculo no frontend)

export interface PcSugestaoDespesa {
  tipo: TfdTipoDespesaConfigKey
  label: string
  icone: string
  dias?: number
}

function calcularDiasPernoite(dataSaida: string, dataChegada: string | null): number | null {
  if (!dataChegada || dataSaida === dataChegada) {
    return null
  }

  const saida = new Date(`${dataSaida}T12:00:00`)
  const chegada = new Date(`${dataChegada}T12:00:00`)
  const diffDias = Math.ceil((chegada.getTime() - saida.getTime()) / (1000 * 60 * 60 * 24))

  return diffDias > 0 ? diffDias : null
}

function temAcompanhante(passageiros: ViagemDetalheOutput['passageiros']): boolean {
  return passageiros.some((passageiro) => passageiro.acompanhantesCount > 0)
}

function configSugestao(
  tipo: TfdTipoDespesaConfigKey,
  dias?: number
): PcSugestaoDespesa | null {
  const config = TFD_TIPO_DESPESA_CONFIG[tipo]
  if (!config) {
    return null
  }

  return {
    tipo,
    label: config.label,
    icone: config.icone,
    dias,
  }
}

export function calcularSugestoesPcViagem(viagem: {
  veiculo: ViagemDetalheOutput['veiculo']
  dataSaida: string
  dataChegada: string | null
  segmentos: SegmentoViagemItem[]
  passageiros: ViagemDetalheOutput['passageiros']
}): PcSugestaoDespesa[] {
  const sugestoes: PcSugestaoDespesa[] = []
  const tiposAdicionados = new Set<TfdTipoDespesaConfigKey>()

  function adicionar(tipo: TfdTipoDespesaConfigKey, dias?: number) {
    if (tiposAdicionados.has(tipo)) {
      return
    }
    const item = configSugestao(tipo, dias)
    if (item) {
      sugestoes.push(item)
      tiposAdicionados.add(tipo)
    }
  }

  const temVeiculoProprio = viagem.veiculo !== null
  const temSegmentoTerrestreProprio = viagem.segmentos.some(
    (segmento) => segmento.tipoSegmento === 'TERRESTRE_PROPRIO'
  )

  if (temVeiculoProprio || temSegmentoTerrestreProprio) {
    adicionar('TRANSPORTE_TERRESTRE')
  }

  if (viagem.segmentos.some((segmento) => segmento.tipoSegmento === 'AEREO')) {
    adicionar('TRANSPORTE_AEREO')
  }

  if (viagem.segmentos.some((segmento) => segmento.tipoSegmento === 'FLUVIAL')) {
    adicionar('TRANSPORTE_FLUVIAL')
  }

  const diasPernoite = calcularDiasPernoite(viagem.dataSaida, viagem.dataChegada)
  if (diasPernoite !== null) {
    adicionar('DIARIA_PACIENTE', diasPernoite)
  }

  if (diasPernoite !== null && temAcompanhante(viagem.passageiros)) {
    adicionar('DIARIA_ACOMPANHANTE', diasPernoite)
  }

  return sugestoes
}
