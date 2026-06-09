'use client'

import { Badge } from '@saude/ui'

// BLOCO-10-VIAGENS
function parseDateOnlyLocal(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number]
  return new Date(year, month - 1, day)
}

function todayLocalDate(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function addDaysLocal(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isSameDayLocal(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function getViagemTemporalBadge(dataSaida: string, status: string) {
  if (status === 'CONCLUIDA' || status === 'CANCELADA') {
    return null
  }

  const saida = parseDateOnlyLocal(dataSaida)
  const hoje = todayLocalDate()
  const amanha = addDaysLocal(hoje, 1)

  if (isSameDayLocal(saida, hoje)) {
    return (
      <Badge variant="orange" size="sm">
        Hoje
      </Badge>
    )
  }

  if (isSameDayLocal(saida, amanha)) {
    return (
      <Badge variant="yellow" size="sm">
        Amanhã
      </Badge>
    )
  }

  if (saida.getTime() < hoje.getTime()) {
    return (
      <Badge variant="red" size="sm">
        Atrasada
      </Badge>
    )
  }

  return null
}
