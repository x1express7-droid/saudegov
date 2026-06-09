'use client'

import type { TfdAgendamentoConsultaListItem } from '@saude/mod-saude-tfd/client'
import {
  DataTable,
  EmptyState,
  ProtocoloBadge,
  StatusBadge,
  type ColumnDef,
} from '@saude/ui'
import { Calendar } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { AgendamentoStatusBadge } from '../../components/agendamento-status-badge'
import { AgendamentoAcoesCelula } from './agendamento-acoes-celula'
import { AgendamentoKanbanView } from './agendamento-kanban-view'
import { AgendamentoListaCompactaView } from './agendamento-lista-compacta-view'
import { AgendamentoListaPaginacao } from './agendamento-lista-paginacao'
import {
  asAgendamentoStatusBadge,
  formatDataHoraAgendamento,
  labelPrestadorNome,
  labelTipoAtendimento,
  normalizeSearch,
  tooltipPrestadorLocal,
} from './agendamento-lista-utils'
import {
  AgendamentoViewToggle,
  TFD_AGENDAMENTOS_VIEW_STORAGE_KEY,
  type AgendamentoViewMode,
} from './agendamento-view-toggle'

// BLOCO-9-AGENDAMENTOS
function AgendamentoStatusDisplay({ status }: { status: string }) {
  if (status === 'REALIZADO') {
    return <AgendamentoStatusBadge status={status} size="sm" />
  }
  return <StatusBadge status={asAgendamentoStatusBadge(status)} size="sm" />
}

function buildQueryString(
  currentSearch: string,
  patch: Record<string, string | undefined>
): string {
  const next = new URLSearchParams(currentSearch)

  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  }

  return next.toString()
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [query])

  return matches
}

function isValidViewMode(value: string | null): value is AgendamentoViewMode {
  return value === 'table' || value === 'kanban' || value === 'list'
}

export interface AgendamentoConsultaListaProps {
  items: TfdAgendamentoConsultaListItem[]
  total: number
  page: number
  perPage: number
  pacienteBusca?: string
  temFiltrosServidor?: boolean
}

export function AgendamentoConsultaLista({
  items,
  total,
  page,
  perPage,
  pacienteBusca = '',
  temFiltrosServidor = false,
}: AgendamentoConsultaListaProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isMobile = useMediaQuery('(max-width: 767px)')

  const [viewMode, setViewMode] = useState<AgendamentoViewMode>('table')
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(TFD_AGENDAMENTOS_VIEW_STORAGE_KEY)
    if (isValidViewMode(stored)) {
      setViewMode(stored)
    }
  }, [])

  const handleViewModeChange = useCallback((nextView: AgendamentoViewMode) => {
    setViewMode(nextView)
    window.localStorage.setItem(TFD_AGENDAMENTOS_VIEW_STORAGE_KEY, nextView)
  }, [])

  const effectiveViewMode: AgendamentoViewMode = isMobile ? 'list' : viewMode

  const filteredItems = useMemo(() => {
    const query = normalizeSearch(pacienteBusca)
    if (!query) {
      return items
    }
    return items.filter((item) => normalizeSearch(item.pacienteNome).includes(query))
  }, [items, pacienteBusca])

  const handlePaginationChange = useCallback(
    (nextPage: number) => {
      const currentSearch =
        typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : ''
      const query = buildQueryString(currentSearch, {
        page: nextPage <= 1 ? undefined : String(nextPage),
        fonte: 'consultas',
      })
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router]
  )

  const handleRowClick = useCallback(
    (row: TfdAgendamentoConsultaListItem) => {
      router.push(`/saude/tfd/processos/${row.processoId}/agendamentos/${row.id}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<TfdAgendamentoConsultaListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <div
            className="min-w-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <ProtocoloBadge
              protocolo={row.original.protocolo}
              className="max-w-full [&_.protocolo]:font-mono [&_.protocolo]:text-xs [&_.protocolo]:font-bold [&_.protocolo]:whitespace-nowrap"
            />
          </div>
        ),
      },
      {
        id: 'paciente',
        header: 'Paciente',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
            {row.original.pacienteNome}
          </span>
        ),
      },
      {
        id: 'data',
        header: 'Data / hora',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[length:var(--text-sm)] text-[var(--color-text)]">
            {formatDataHoraAgendamento(row.original.dataConsulta, row.original.horaConsulta)}
          </span>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            {labelTipoAtendimento(row.original.tipoAtendimento)}
          </span>
        ),
      },
      {
        id: 'prestador',
        header: 'Prestador',
        cell: ({ row }) => {
          const tooltip = tooltipPrestadorLocal(row.original)
          return (
            <span
              className="block max-w-48 truncate text-[length:var(--text-sm)] text-[var(--color-text)]"
              title={tooltip}
            >
              {labelPrestadorNome(row.original)}
            </span>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <AgendamentoStatusDisplay status={row.original.status} />,
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => <AgendamentoAcoesCelula item={row.original} />,
      },
    ],
    []
  )

  const temFiltrosAtivos = temFiltrosServidor || pacienteBusca.trim().length > 0
  const paginationProps = { page, perPage, total, onPaginationChange: handlePaginationChange }

  const emptyState =
    total === 0 ? (
      <EmptyState
        icon={<Calendar className="size-6" aria-hidden="true" />}
        titulo={
          temFiltrosAtivos
            ? 'Nenhum agendamento encontrado para os filtros selecionados.'
            : 'Nenhum agendamento cadastrado.'
        }
        descricao={
          temFiltrosAtivos
            ? 'Ajuste os filtros ou limpe-os para ampliar a busca.'
            : 'Agendamentos são criados a partir de solicitações aprovadas.'
        }
      />
    ) : filteredItems.length === 0 ? (
      <EmptyState
        icon={<Calendar className="size-6" aria-hidden="true" />}
        titulo="Nenhum agendamento encontrado para os filtros selecionados."
        descricao="Nenhum registro nesta página corresponde à busca por paciente."
      />
    ) : null

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-3)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <AgendamentoViewToggle value={viewMode} onChange={handleViewModeChange} />
          {effectiveViewMode === 'kanban' ? (
            <label className="hidden cursor-pointer items-center gap-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)] md:inline-flex">
              <input
                type="checkbox"
                className="size-4 rounded border-[var(--color-border)]"
                checked={mostrarEncerrados}
                onChange={(event) => setMostrarEncerrados(event.target.checked)}
              />
              Mostrar encerrados
            </label>
          ) : null}
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {total} registros
          </p>
        </div>
      </div>

      {pacienteBusca.trim() && filteredItems.length > 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          {filteredItems.length} agendamento(s) nesta página correspondem à busca por paciente.
        </p>
      ) : null}

      {emptyState}

      {total > 0 && filteredItems.length > 0 && effectiveViewMode === 'table' ? (
        <DataTable
          data={filteredItems}
          columns={columns}
          pagination={{ page, perPage, total }}
          onPaginationChange={handlePaginationChange}
          onRowClick={handleRowClick}
          emptyMessage="Nenhum agendamento encontrado."
        />
      ) : null}

      {total > 0 && filteredItems.length > 0 && effectiveViewMode === 'kanban' ? (
        <>
          <AgendamentoKanbanView items={filteredItems} mostrarEncerrados={mostrarEncerrados} />
          <AgendamentoListaPaginacao {...paginationProps} />
        </>
      ) : null}

      {total > 0 && filteredItems.length > 0 && effectiveViewMode === 'list' ? (
        <>
          <AgendamentoListaCompactaView items={filteredItems} />
          <AgendamentoListaPaginacao {...paginationProps} />
        </>
      ) : null}
    </div>
  )
}
