import type { TfdVedacaoCodigo, TfdVedacaoItem, TfdVedacoesResultado } from '../types/tfd.types'

/** Portaria SAS/MS nº 55/1999 — deslocamento mínimo (CODING_STANDARDS.md). */
export const MIN_DISTANCIA_TFD_KM = 50

export interface AvaliarVedacoesTfdInput {
  /** Pelo menos um procedimento marcado como PAB no cadastro. */
  possuiProcedimentoPab: boolean
  /** Quando calculável (cadastro ou informado na decisão). */
  distanciaKm: number | null
  tratamentoExperimental: boolean
  regiaoMetropolitana: boolean
  pacienteHospitalizadoDestino: boolean
  /** Confirmação explícita do gestor para alertas subjetivos (§1.5). */
  confirmacaoVedacoes: boolean
}

function item(
  codigo: TfdVedacaoCodigo,
  severidade: TfdVedacaoItem['severidade'],
  mensagem: string
): TfdVedacaoItem {
  return { codigo, severidade, mensagem }
}

/**
 * Avalia vedações legais na aprovação TFD (§1.5).
 * - BLOQUEIO: PAB e distância &lt; 50 km quando `distanciaKm` conhecida.
 * - ALERTA: flags subjetivas — exige `confirmacaoVedacoes`.
 */
export function avaliarVedacoesTfd(input: AvaliarVedacoesTfdInput): TfdVedacoesResultado {
  const itens: TfdVedacaoItem[] = []

  if (input.possuiProcedimentoPab) {
    itens.push(
      item(
        'PAB',
        'BLOQUEIO',
        'Procedimento do Piso de Atenção Básica (PAB) não pode ser autorizado para TFD.'
      )
    )
  }

  if (input.distanciaKm !== null && input.distanciaKm < MIN_DISTANCIA_TFD_KM) {
    itens.push(
      item(
        'DISTANCIA_MINIMA',
        'BLOQUEIO',
        `Distância informada (${input.distanciaKm} km) é inferior ao mínimo de ${MIN_DISTANCIA_TFD_KM} km exigido para TFD.`
      )
    )
  }

  if (input.tratamentoExperimental) {
    itens.push(
      item(
        'TRATAMENTO_EXPERIMENTAL',
        'ALERTA',
        'Tratamento experimental indicado — confirme a autorização com fundamentação adequada.'
      )
    )
  }

  if (input.regiaoMetropolitana) {
    itens.push(
      item(
        'REGIAO_METROPOLITANA',
        'ALERTA',
        'Deslocamento em região metropolitana indicado — verifique elegibilidade antes de aprovar.'
      )
    )
  }

  if (input.pacienteHospitalizadoDestino) {
    itens.push(
      item(
        'PACIENTE_HOSPITALIZADO',
        'ALERTA',
        'Paciente hospitalizado no destino — diárias de pernoite não se aplicam neste caso.'
      )
    )
  }

  const possuiBloqueio = itens.some((vedacao) => vedacao.severidade === 'BLOQUEIO')
  const possuiAlerta = itens.some((vedacao) => vedacao.severidade === 'ALERTA')
  const exigeConfirmacao =
    possuiAlerta ||
    input.tratamentoExperimental ||
    input.regiaoMetropolitana ||
    input.pacienteHospitalizadoDestino

  const confirmacaoOk = !exigeConfirmacao || input.confirmacaoVedacoes

  return {
    itens,
    possuiBloqueio,
    possuiAlerta,
    exigeConfirmacao,
    podeAprovar: !possuiBloqueio && confirmacaoOk,
  }
}
