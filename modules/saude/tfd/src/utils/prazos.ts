import { addDays, addHours } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

/** Prazo para envio da prestação de contas (BUSINESS_RULES.md §1.7, CODING_STANDARDS.md). */
export const PRAZO_PRESTACAO_DIAS = 10

/** Início do dia em UTC — comparação estável para datas @db.Date de CNH. */
function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/** CNH com validade anterior ao dia de referência (padrão: hoje). */
export function isCnhVencida(validade: Date, dataReferencia: Date = new Date()): boolean {
  const referencia = startOfDayUtc(dataReferencia)
  const vencimento = startOfDayUtc(validade)
  return vencimento < referencia
}

/**
 * CNH ainda válida hoje, com vencimento em até `diasAlerta` dias (inclusive).
 * Padrão: 30 dias (BUSINESS_RULES.md §1.6).
 */
export function isCnhVencendoEmBreve(validade: Date, diasAlerta = 30): boolean {
  if (isCnhVencida(validade)) {
    return false
  }

  const hoje = startOfDayUtc(new Date())
  const vencimento = startOfDayUtc(validade)
  const limite = new Date(hoje)
  limite.setUTCDate(limite.getUTCDate() + diasAlerta)

  return vencimento <= limite
}

/**
 * Instantâneo mínimo permitido para início da viagem (data + hora no timezone do tenant).
 * Regra: agora no fuso do município + 72 horas (BUSINESS_RULES.md §1.6, §1.13).
 */
export function calcMinDataAgendamento72h(dataHoraAgora: Date, timezone: string): Date {
  const agoraNoTenant = toZonedTime(dataHoraAgora, timezone)
  const minimoNoTenant = addHours(agoraNoTenant, 72)
  return fromZonedTime(minimoNoTenant, timezone)
}

/**
 * Prazo limite (`prazo_envio_at`) para envio da prestação de contas.
 * Regra: data da viagem + 10 dias corridos, fim do dia no fuso do município
 * (BUSINESS_RULES.md §1.7, §1.10; DATABASE_SCHEMA.md §4.6).
 */
export function calcPrazoEnvioPrestacao(dataViagem: Date, timezone: string): Date {
  const year = dataViagem.getUTCFullYear()
  const month = dataViagem.getUTCMonth()
  const day = dataViagem.getUTCDate()

  const dataBaseNoTenant = new Date(year, month, day, 0, 0, 0, 0)
  const prazoDiaNoTenant = addDays(dataBaseNoTenant, PRAZO_PRESTACAO_DIAS)
  const fimDoPrazoNoTenant = new Date(
    prazoDiaNoTenant.getFullYear(),
    prazoDiaNoTenant.getMonth(),
    prazoDiaNoTenant.getDate(),
    23,
    59,
    59,
    999
  )

  return fromZonedTime(fimDoPrazoNoTenant, timezone)
}
