/** Prazos de complemento pendente — BUSINESS_RULES.md §1.5, §1.9, §1.10. */

export const MS_POR_DIA = 24 * 60 * 60 * 1000

/** Alerta no dashboard do gestor (§1.2.1). */
export const DIAS_ALERTA_PENDENTE_30 = 30

/** Cancelamento permitido com motivo "prazo esgotado" (§1.9). */
export const DIAS_CANCELAMENTO_PENDENTE_COMPLEMENTO = 60

export function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * MS_POR_DIA)
}

export function diasDesde(dataReferencia: Date, referencia: Date = new Date()): number {
  return Math.floor((referencia.getTime() - dataReferencia.getTime()) / MS_POR_DIA)
}

/**
 * Complemento solicitado há pelo menos `diasMinimos` dias corridos
 * (data da tramitação COMPLEMENTO_SOLICITADO ≤ referência − N dias).
 */
export function isComplementoPendenteHaPeloMenosDias(
  complementoSolicitadoEm: Date,
  diasMinimos: number,
  referencia: Date = new Date()
): boolean {
  const limite = subtractDays(referencia, diasMinimos)
  return complementoSolicitadoEm <= limite
}

/** Gestor pode cancelar PENDENTE com motivo "prazo esgotado" (§1.9). */
export function isElegivelCancelamentoPrazoEsgotado(
  complementoSolicitadoEm: Date | null | undefined,
  referencia: Date = new Date()
): boolean {
  if (!complementoSolicitadoEm) {
    return false
  }
  return isComplementoPendenteHaPeloMenosDias(
    complementoSolicitadoEm,
    DIAS_CANCELAMENTO_PENDENTE_COMPLEMENTO,
    referencia
  )
}

export type TramitacaoComplementoSolicitado = {
  processo_id: string
  created_at: Date
}

/** Última tramitação COMPLEMENTO_SOLICITADO por processo (lista já ordenada desc). */
export function mapComplementoMaisRecentePorProcesso(
  tramitacoes: TramitacaoComplementoSolicitado[]
): Map<string, Date> {
  const complementoMaisRecentePorProcesso = new Map<string, Date>()

  for (const item of tramitacoes) {
    if (!complementoMaisRecentePorProcesso.has(item.processo_id)) {
      complementoMaisRecentePorProcesso.set(item.processo_id, item.created_at)
    }
  }

  return complementoMaisRecentePorProcesso
}

export interface SolicitacaoPendenteComplementoRow {
  id: string
  processo_id: string
  protocolo: string
  paciente: { nome: string }
}

export interface AlertaPendenteComplementoBuilt extends SolicitacaoPendenteComplementoRow {
  complementoSolicitadoEm: string
  diasPendente: number
}

/**
 * Filtra solicitações PENDENTE com complemento há ≥ `diasMinimos` dias.
 * Ordenação: complemento mais antigo primeiro.
 */
export function buildAlertasPendenteComplemento<T extends SolicitacaoPendenteComplementoRow>(
  solicitacoes: T[],
  complementoMaisRecentePorProcesso: Map<string, Date>,
  diasMinimos: number,
  referencia: Date = new Date()
): Array<T & { complementoSolicitadoEm: string; diasPendente: number }> {
  const alertas: Array<T & { complementoSolicitadoEm: string; diasPendente: number }> = []

  for (const solicitacao of solicitacoes) {
    const complementoAt = complementoMaisRecentePorProcesso.get(solicitacao.processo_id)
    if (
      !complementoAt ||
      !isComplementoPendenteHaPeloMenosDias(complementoAt, diasMinimos, referencia)
    ) {
      continue
    }

    alertas.push({
      ...solicitacao,
      complementoSolicitadoEm: complementoAt.toISOString(),
      diasPendente: diasDesde(complementoAt, referencia),
    })
  }

  alertas.sort(
    (a, b) =>
      new Date(a.complementoSolicitadoEm).getTime() -
      new Date(b.complementoSolicitadoEm).getTime()
  )

  return alertas
}
