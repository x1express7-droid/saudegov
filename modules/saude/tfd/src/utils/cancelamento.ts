/** Status em que o cancelamento pelo sistema é bloqueado (§1.9 BUSINESS_RULES). */
export const TFD_STATUS_BLOQUEIA_CANCELAMENTO = [
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
] as const

export type TfdStatusBloqueiaCancelamento =
  (typeof TFD_STATUS_BLOQUEIA_CANCELAMENTO)[number]

const STATUS_TERMINAIS_SEM_CANCELAMENTO = new Set<string>([
  ...TFD_STATUS_BLOQUEIA_CANCELAMENTO,
  'CANCELADO',
  'NEGADO',
])

export function isStatusCancelavelTfd(status: string): boolean {
  return !STATUS_TERMINAIS_SEM_CANCELAMENTO.has(status)
}

export function mensagemStatusNaoCancelavel(status: string): string {
  if (status === 'CANCELADO') {
    return 'Esta solicitação já está cancelada.'
  }
  if (status === 'NEGADO') {
    return 'Solicitações negadas não podem ser canceladas.'
  }
  if (TFD_STATUS_BLOQUEIA_CANCELAMENTO.includes(status as TfdStatusBloqueiaCancelamento)) {
    return 'Não é possível cancelar após o agendamento da viagem. Entre em contato com a gestão.'
  }
  return 'O status atual não permite cancelamento.'
}
