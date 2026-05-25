'use client'

import { Button, Card, Input } from '@saude/ui'
import { endOfWeek, format, startOfWeek } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

function getCurrentWeekRange(): { dataInicio: string; dataFim: string } {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  return {
    dataInicio: format(start, 'yyyy-MM-dd'),
    dataFim: format(end, 'yyyy-MM-dd'),
  }
}

const FILTER_KEYS = ['dataInicio', 'dataFim', 'motoristaId', 'veiculoId', 'page'] as const

function buildQueryString(
  current: URLSearchParams,
  patch: Record<string, string | undefined>
): string {
  const next = new URLSearchParams(current.toString())

  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  }

  next.delete('page')

  return next.toString()
}

export function AgendamentoFiltros() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const dataInicioParam = searchParams.get('dataInicio') ?? ''
  const dataFimParam = searchParams.get('dataFim') ?? ''

  const [dataInicio, setDataInicio] = useState(dataInicioParam)
  const [dataFim, setDataFim] = useState(dataFimParam)

  useEffect(() => {
    setDataInicio(dataInicioParam)
    setDataFim(dataFimParam)
  }, [dataInicioParam, dataFimParam])

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const query = buildQueryString(searchParams, patch)
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router, searchParams]
  )

  function handleApply() {
    pushParams({
      dataInicio: dataInicio.trim() || undefined,
      dataFim: dataFim.trim() || undefined,
    })
  }

  function handleClear() {
    const { dataInicio: inicioSemana, dataFim: fimSemana } = getCurrentWeekRange()
    setDataInicio(inicioSemana)
    setDataFim(fimSemana)

    const next = new URLSearchParams(searchParams.toString())
    for (const key of FILTER_KEYS) {
      next.delete(key)
    }
    next.set('dataInicio', inicioSemana)
    next.set('dataFim', fimSemana)

    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-4)]">
        <div className="grid gap-[var(--space-4)] md:grid-cols-2">
          <Input
            id="filtro-data-inicio-tfd"
            label="Data início"
            type="date"
            value={dataInicio}
            onChange={(event) => setDataInicio(event.target.value)}
          />
          <Input
            id="filtro-data-fim-tfd"
            label="Data fim"
            type="date"
            value={dataFim}
            onChange={(event) => setDataFim(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <Button type="button" variant="primary" onClick={handleApply}>
            Aplicar filtros
          </Button>
          <Button type="button" variant="ghost" onClick={handleClear}>
            Limpar filtros
          </Button>
        </div>
      </div>
    </Card>
  )
}
