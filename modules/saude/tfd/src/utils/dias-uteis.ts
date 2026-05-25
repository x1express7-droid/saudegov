const MS_POR_DIA = 24 * 60 * 60 * 1000

function isDiaUtil(date: Date): boolean {
  const day = date.getUTCDay()
  return day !== 0 && day !== 6
}

/** Conta dias úteis (seg–sex) entre duas datas UTC (exclusive do fim). */
export function contarDiasUteisEntre(inicio: Date, fim: Date): number {
  if (fim.getTime() <= inicio.getTime()) {
    return 0
  }

  let count = 0
  const cursor = new Date(inicio.getTime())

  while (cursor.getTime() < fim.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    if (isDiaUtil(cursor)) {
      count += 1
    }
  }

  return count
}

/** Soma dias úteis a uma data UTC (retorna fim do dia alvo). */
export function adicionarDiasUteis(data: Date, diasUteis: number): Date {
  const result = new Date(data.getTime())
  let restantes = diasUteis

  while (restantes > 0) {
    result.setUTCDate(result.getUTCDate() + 1)
    if (isDiaUtil(result)) {
      restantes -= 1
    }
  }

  return result
}

export function inicioDoDiaUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function diferencaDiasCorridos(inicio: Date, fim: Date): number {
  const a = inicioDoDiaUtc(inicio).getTime()
  const b = inicioDoDiaUtc(fim).getTime()
  return Math.floor((b - a) / MS_POR_DIA)
}
