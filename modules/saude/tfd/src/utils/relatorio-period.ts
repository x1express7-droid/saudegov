/** Intervalo UTC inclusivo para filtros de período (AAAA-MM-DD). */
export function periodoRangeUtc(dataInicio: string, dataFim: string): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(`${dataInicio}T00:00:00.000Z`),
    fim: new Date(`${dataFim}T23:59:59.999Z`),
  }
}

export function competenciaRangeUtc(mes: number, ano: number): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(Date.UTC(ano, mes - 1, 1)),
    fim: new Date(Date.UTC(ano, mes, 1)),
  }
}

export function formatPeriodoLabel(dataInicio: string, dataFim: string): string {
  const toBr = (iso: string) => {
    const [year, month, day] = iso.split('-')
    if (!year || !month || !day) {
      return iso
    }
    return `${day}/${month}/${year}`
  }
  return `${toBr(dataInicio)} — ${toBr(dataFim)}`
}
