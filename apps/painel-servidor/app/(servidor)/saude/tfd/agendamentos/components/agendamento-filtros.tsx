'use client'

import { Card, Input, Select } from '@saude/ui'
import { getDefaultAgendamentosPeriodo } from '@/lib/tfd/default-agendamentos-periodo'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

// BLOCO-9-AGENDAMENTOS
const ALL_FILTER_VALUE = '__all__'

const STATUS_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: 'Todos' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'EM_VIAGEM', label: 'Em Viagem' },
  { value: 'REALIZADO', label: 'Realizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const AGENDAMENTO_STATUS_VALUES = new Set<string>([
  'AGENDADO',
  'EM_VIAGEM',
  'REALIZADO',
  'CANCELADO',
])

function buildQueryString(
  current: URLSearchParams,
  patch: Record<string, string | undefined>,
  options?: { resetPage?: boolean }
): string {
  const next = new URLSearchParams(current.toString())

  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  }

  if (options?.resetPage !== false && !('page' in patch)) {
    next.delete('page')
  }

  return next.toString()
}

export interface AgendamentoFiltrosProps {
  modo?: 'consultas' | 'viagens'
  pacienteBusca?: string
  onPacienteBuscaChange?: (value: string) => void
}

export function AgendamentoFiltros({
  modo = 'consultas',
  pacienteBusca = '',
  onPacienteBuscaChange,
}: AgendamentoFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const dataInicioParam = searchParams.get('dataInicio') ?? ''
  const dataFimParam = searchParams.get('dataFim') ?? ''
  const statusParam = searchParams.get('status') ?? ''

  const [avancadosAbertos, setAvancadosAbertos] = useState(
    Boolean(dataInicioParam || dataFimParam)
  )

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>, options?: { resetPage?: boolean }) => {
      const query = buildQueryString(searchParams, patch, options)
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router, searchParams]
  )

  const statusValue =
    statusParam && AGENDAMENTO_STATUS_VALUES.has(statusParam) ? statusParam : ALL_FILTER_VALUE

  const { dataInicio: defaultInicio, dataFim: defaultFim } = useMemo(
    () => getDefaultAgendamentosPeriodo(),
    []
  )

  const temFiltrosAtivos = useMemo(() => {
    if (modo === 'consultas' && pacienteBusca.trim()) {
      return true
    }
    if (statusParam && AGENDAMENTO_STATUS_VALUES.has(statusParam)) {
      return true
    }
    if (dataInicioParam && dataInicioParam !== defaultInicio) {
      return true
    }
    if (dataFimParam && dataFimParam !== defaultFim) {
      return true
    }
    return false
  }, [
    modo,
    pacienteBusca,
    statusParam,
    dataInicioParam,
    dataFimParam,
    defaultInicio,
    defaultFim,
  ])

  function handleLimpar() {
    onPacienteBuscaChange?.('')
    setAvancadosAbertos(false)

    const next = new URLSearchParams(searchParams.toString())
    next.delete('status')
    next.delete('page')
    next.set('fonte', modo)
    next.set('dataInicio', defaultInicio)
    next.set('dataFim', defaultFim)

    router.push(`${pathname}?${next.toString()}`)
  }

  if (modo === 'viagens') {
    return (
      <Card>
        <div className="flex flex-col gap-[var(--space-4)]">
          <div className="grid gap-[var(--space-4)] md:grid-cols-2">
            <Input
              id="filtro-data-inicio-legado-tfd"
              label="Data início"
              type="date"
              value={dataInicioParam}
              onChange={(event) =>
                pushParams({ dataInicio: event.target.value || undefined })
              }
            />
            <Input
              id="filtro-data-fim-legado-tfd"
              label="Data fim"
              type="date"
              value={dataFimParam}
              onChange={(event) => pushParams({ dataFim: event.target.value || undefined })}
            />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-4)]">
        <div className="grid gap-[var(--space-4)] md:grid-cols-2">
          <Input
            id="filtro-paciente-agendamento-tfd"
            label="Buscar por paciente"
            placeholder="Nome do paciente..."
            value={pacienteBusca}
            onChange={(event) => onPacienteBuscaChange?.(event.target.value)}
          />
          <Select
            id="filtro-status-agendamento-tfd"
            label="Status"
            placeholder="Todos"
            options={STATUS_OPTIONS}
            value={statusValue}
            onValueChange={(value) =>
              pushParams({
                status: value === ALL_FILTER_VALUE ? undefined : value,
              })
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <button
            type="button"
            className="inline-flex items-center gap-[var(--space-1)] text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
            onClick={() => setAvancadosAbertos((current) => !current)}
          >
            Filtros avançados
            {avancadosAbertos ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>

          {temFiltrosAtivos ? (
            <button
              type="button"
              className="text-[length:var(--text-xs)] text-[var(--color-primary)] hover:underline"
              onClick={handleLimpar}
            >
              Limpar
            </button>
          ) : null}
        </div>

        {avancadosAbertos ? (
          <div className="grid gap-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)] md:grid-cols-2 lg:max-w-xl">
            <Input
              id="filtro-data-inicio-agendamento-tfd"
              label="Data início"
              type="date"
              value={dataInicioParam}
              onChange={(event) =>
                pushParams({ dataInicio: event.target.value || undefined })
              }
            />
            <Input
              id="filtro-data-fim-agendamento-tfd"
              label="Data fim"
              type="date"
              value={dataFimParam}
              onChange={(event) => pushParams({ dataFim: event.target.value || undefined })}
            />
          </div>
        ) : null}
      </div>
    </Card>
  )
}