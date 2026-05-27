'use client'

import { Button, Card, Input, Select } from '@saude/ui'
import { getDefaultAgendamentosPeriodo } from '@/lib/tfd/default-agendamentos-periodo'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const FILTER_KEYS = [
  'dataInicio',
  'dataFim',
  'motoristaId',
  'veiculoId',
  'prestadorId',
  'status',
  'page',
] as const

const STATUS_CONSULTA_OPTIONS = [
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'EM_VIAGEM', label: 'Em viagem' },
  { value: 'REALIZADO', label: 'Realizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

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

export interface AgendamentoFiltrosProps {
  modo?: 'consultas' | 'viagens'
}

export function AgendamentoFiltros({ modo = 'consultas' }: AgendamentoFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const dataInicioParam = searchParams.get('dataInicio') ?? ''
  const dataFimParam = searchParams.get('dataFim') ?? ''
  const statusParam = searchParams.get('status') ?? ''

  const [dataInicio, setDataInicio] = useState(dataInicioParam)
  const [dataFim, setDataFim] = useState(dataFimParam)
  const [status, setStatus] = useState(statusParam)

  useEffect(() => {
    setDataInicio(dataInicioParam)
    setDataFim(dataFimParam)
    setStatus(statusParam)
  }, [dataInicioParam, dataFimParam, statusParam])

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
      ...(modo === 'consultas'
        ? { status: status.trim() || undefined }
        : { status: undefined }),
    })
  }

  function handleClear() {
    const { dataInicio: inicioPadrao, dataFim: fimPadrao } = getDefaultAgendamentosPeriodo()
    setDataInicio(inicioPadrao)
    setDataFim(fimPadrao)
    setStatus('')

    const next = new URLSearchParams(searchParams.toString())
    for (const key of FILTER_KEYS) {
      next.delete(key)
    }
    if (!next.get('fonte')) {
      next.set('fonte', modo)
    }
    next.set('dataInicio', inicioPadrao)
    next.set('dataFim', fimPadrao)

    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-4)]">
        <div className="grid gap-[var(--space-4)] md:grid-cols-2 lg:grid-cols-3">
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
          {modo === 'consultas' ? (
            <Select
              label="Status"
              value={status || undefined}
              placeholder="Todos os status"
              options={STATUS_CONSULTA_OPTIONS}
              onValueChange={setStatus}
            />
          ) : null}
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
