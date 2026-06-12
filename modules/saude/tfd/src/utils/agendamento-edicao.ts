import { toZonedTime } from 'date-fns-tz'

/** Edição permitida somente com status AGENDADO e antes do dia da consulta. */
export function podeEditarAgendamentoDados(
  status: string,
  dataConsulta: string,
  timezone: string
): boolean {
  if (status !== 'AGENDADO') {
    return false
  }

  const [year, month, day] = dataConsulta.split('-').map(Number) as [number, number, number]
  const inicioConsulta = new Date(year, month - 1, day, 0, 0, 0, 0)

  const hojeNoTenant = toZonedTime(new Date(), timezone)
  const inicioHoje = new Date(
    hojeNoTenant.getFullYear(),
    hojeNoTenant.getMonth(),
    hojeNoTenant.getDate(),
    0,
    0,
    0,
    0
  )

  return inicioConsulta > inicioHoje
}
