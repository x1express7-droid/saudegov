import { fromZonedTime } from 'date-fns-tz'

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export function resolveTenantTimezone(settings: unknown): string {
  if (typeof settings !== 'object' || settings === null) {
    return DEFAULT_TIMEZONE
  }

  const timezone = (settings as Record<string, unknown>).timezone
  return typeof timezone === 'string' && timezone.trim() !== ''
    ? timezone.trim()
    : DEFAULT_TIMEZONE
}

export function parseDataConsultaUtc(dataConsulta: string): Date {
  const [year, month, day] = dataConsulta.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

export function parseHoraConsultaUtc(horaConsulta: string | undefined): Date | null {
  if (!horaConsulta) {
    return null
  }

  const [hours, minutes] = horaConsulta.split(':').map(Number) as [number, number]
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0))
}

export function formatHoraConsulta(hora: Date | null): string | null {
  if (!hora) {
    return null
  }

  const horas = hora.getUTCHours().toString().padStart(2, '0')
  const minutos = hora.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
}

export function buildInicioConsultaInstant(
  dataConsulta: string,
  horaConsulta: string | undefined,
  timezone: string
): Date {
  const [year, month, day] = dataConsulta.split('-').map(Number) as [number, number, number]
  const [hours, minutes] = (horaConsulta ?? '00:00').split(':').map(Number) as [number, number]
  return fromZonedTime(new Date(year, month - 1, day, hours, minutes, 0, 0), timezone)
}
