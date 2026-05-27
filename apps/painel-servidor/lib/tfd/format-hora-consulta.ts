/** Formata hora UTC do Prisma (TIME) como HH:mm. */
export function formatHoraConsulta(hora: Date | null): string | null {
  if (!hora) {
    return null
  }

  const horas = hora.getUTCHours().toString().padStart(2, '0')
  const minutos = hora.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
}
