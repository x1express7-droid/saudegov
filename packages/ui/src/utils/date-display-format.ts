import { isoDateToBr } from './date-input-format'

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Converte `yyyy-MM-dd` ou ISO datetime para `dd/MM/yyyy` (pt-BR). */
export function formatDateOnlyBr(value: string | null | undefined, fallback = '—'): string {
  if (!value?.trim()) {
    return fallback
  }

  const trimmed = value.trim()
  const datePart = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed

  if (ISO_DATE_ONLY.test(datePart)) {
    return isoDateToBr(datePart) || fallback
  }

  try {
    const parsed = new Date(trimmed)
    if (Number.isNaN(parsed.getTime())) {
      return trimmed
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsed)
  } catch {
    return trimmed
  }
}

/** Data e hora completas em pt-BR (`dd/MM/yyyy, HH:mm`). */
export function formatDateTimeBr(
  value: string | Date | null | undefined,
  fallback = '—'
): string {
  if (value == null || value === '') {
    return fallback
  }

  try {
    const date = typeof value === 'string' ? new Date(value) : value
    if (Number.isNaN(date.getTime())) {
      return typeof value === 'string' ? value : fallback
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return typeof value === 'string' ? value : fallback
  }
}

/** Data (`yyyy-MM-dd`) + hora opcional (`HH:mm`). */
export function formatDateHoraBr(
  data: string,
  hora: string | null | undefined,
  fallback = '—'
): string {
  const dataLabel = formatDateOnlyBr(data, fallback)
  if (!hora?.trim()) {
    return dataLabel
  }
  return `${dataLabel} às ${hora.trim()}`
}
