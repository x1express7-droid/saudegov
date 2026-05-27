const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const BR_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/

export function isoDateToBr(iso: string): string {
  const match = ISO_DATE_REGEX.exec(iso.trim())
  if (!match) {
    return ''
  }

  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

export function brDateToIso(br: string): string | null {
  const match = BR_DATE_REGEX.exec(br.trim())
  if (!match) {
    return null
  }

  const [, dayStr, monthStr, yearStr] = match
  const day = Number(dayStr)
  const month = Number(monthStr)
  const year = Number(yearStr)

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return `${yearStr}-${monthStr}-${dayStr}`
}

export function maskBrDateInput(raw: string): string {
  const trimmed = raw.trim()
  if (ISO_DATE_REGEX.test(trimmed)) {
    return isoDateToBr(trimmed)
  }

  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) {
    return digits
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
