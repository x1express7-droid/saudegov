/** Timezone padrão quando o tenant não informa `settings.timezone`. */
export const DEFAULT_EXPORT_TIMEZONE = 'America/Sao_Paulo'

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Converte `yyyy-MM-dd` para `dd/MM/yyyy`. */
export function formatDateBr(isoDate: string): string {
  const trimmed = isoDate.trim()
  const datePart = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed
  const match = ISO_DATE_ONLY.exec(datePart)
  if (!match) {
    return trimmed
  }
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/** Formata campo `@db.Date` do Prisma sem deslocamento de fuso. */
export function formatDateBrFromDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return formatDateBr(`${year}-${month}-${day}`)
}

/**
 * Formata data/hora para exibição em relatórios e exports (pt-BR).
 * Usa o timezone do município quando informado (IANA, ex.: America/Sao_Paulo).
 */
export function formatDataHoraBr(isoOrDate: string | Date, timezone?: string): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const timeZone = timezone?.trim() || DEFAULT_EXPORT_TIMEZONE

  return date.toLocaleString('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
