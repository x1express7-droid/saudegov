'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import {
  Button,
  DataTable,
  EmptyState,
  ProtocoloBadge,
  StatusBadge,
  TFD_STATUS_CONFIG,
  TFD_URGENCIA_CONFIG,
  UrgenciaBadge,
  type ColumnDef,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ProcessoAcoesCelula } from './processo-acoes-celula'
import { ProcessoKanbanView } from './processo-kanban-view'
import { ProcessoListaCompactaView } from './processo-lista-compacta-view'
import { ProcessoListaPaginacao } from './processo-lista-paginacao'
import { ProcessoSolicitacoesCelula } from './processo-solicitacoes-celula'
import { formatDateTimeFull, formatRelativeTime } from './processo-lista-utils'
import {
  ProcessoViewToggle,
  TFD_PROCESSOS_VIEW_STORAGE_KEY,
  type ProcessoViewMode,
} from './processo-view-toggle'

// BLOCO-8-PROCESSOS
const PROCESSOS_BASE = '/saude/tfd/processos'
const PACIENTE_BASE = '/saude/tfd/pacientes'

type ProcessoTableRow = ProcessoTfdListItem & { urgencia?: string }

function asTfdStatus(value: string | null): TfdStatus | null {
  if (!value || !(value in TFD_STATUS_CONFIG)) {
    return null
  }
  return value as TfdStatus
}

function asTfdUrgencia(value: string | null): TfdUrgencia | null {
  if (!value || !(value in TFD_URGENCIA_CONFIG)) {
    return null
  }
  return value as TfdUrgencia
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

function isValidViewMode(value: string | null): value is ProcessoViewMode {
  return value === 'table' || value === 'kanban' || value === 'list'
}

export interface ProcessoListaProps {
  items: ProcessoTfdListItem[]
  total: number
  page: number
  perPage: number
  session: SaudeMunicSession
  podeNovaSolicitacao: boolean
}

export function ProcessoLista({
  items,
  total,
  page,
  perPage,
  session,
  podeNovaSolicitacao,
}: ProcessoListaProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')

  const [viewMode, setViewMode] = useState<ProcessoViewMode>('table')
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(TFD_PROCESSOS_VIEW_STORAGE_KEY)
    if (isValidViewMode(stored)) {
      setViewMode(stored)
    }
  }, [])

  const handleViewModeChange = useCallback((nextView: ProcessoViewMode) => {
    setViewMode(nextView)
    window.localStorage.setItem(TFD_PROCESSOS_VIEW_STORAGE_KEY, nextView)
  }, [])

  const effectiveViewMode: ProcessoViewMode = isMobile ? 'list' : viewMode

  const tableData = useMemo<ProcessoTableRow[]>(
    () =>
      items.map((item) => ({
        ...item,
        urgencia: item.urgenciaMaisCritica ?? undefined,
      })),
    [items]
  )

  const handlePaginationChange = useCallback(
    (nextPage: number) => {
      const currentSearch =
        typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : ''
      const query = buildQueryString(currentSearch, {
        page: nextPage <= 1 ? undefined : String(nextPage),
      })
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router]
  )

  const handleRowClick = useCallback(
    (row: ProcessoTfdListItem) => {
      router.push(`${PROCESSOS_BASE}/${row.processoId}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<ProcessoTableRow>[]>(() => {
    const baseColumns: ColumnDef<ProcessoTableRow>[] = [
      {
        id: 'protocolo',
        header: 'Processo',
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
        cell: ({ row }) =>
          row.original.paciente ? (
            <Link
              href={`${PACIENTE_BASE}/${row.original.paciente.id}`}
              className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.paciente.nome}
            </Link>
          ) : (
            <span className="text-[var(--color-text-muted)]">—</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = asTfdStatus(row.original.statusSolicitacaoMaisRecente)
          if (!status) {
            return <span className="text-[var(--color-text-muted)]">—</span>
          }
          return <StatusBadge status={status} size="sm" />
        },
      },
      {
        id: 'urgencia',
        header: 'Urgência',
        cell: ({ row }) => {
          const urgencia = asTfdUrgencia(row.original.urgenciaMaisCritica)
          if (!urgencia) {
            return <span className="text-[var(--color-text-muted)]">—</span>
          }
          return <UrgenciaBadge urgencia={urgencia} size="sm" />
        },
      },
    ]

    if (!isTablet) {
      baseColumns.push({
        id: 'solicitacoes',
        header: 'Solicitações',
        cell: ({ row }) => (
          <ProcessoSolicitacoesCelula solicitacoes={row.original.solicitacoes} />
        ),
      })
    }

    baseColumns.push(
      {
        id: 'movimentacao',
        header: 'Última movimentação',
        cell: ({ row }) => (
          <span
            className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
            title={formatDateTimeFull(row.original.ultimaMovimentacaoEm)}
          >
            {formatRelativeTime(row.original.ultimaMovimentacaoEm)}
          </span>
        ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <ProcessoAcoesCelula item={row.original} podeNovaSolicitacao={podeNovaSolicitacao} />
        ),
      }
    )

    return baseColumns
  }, [isTablet, podeNovaSolicitacao])

  const paginationProps = { page, perPage, total, onPaginationChange: handlePaginationChange }

  const emptyCta = (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}>
      <Button variant="primary" asChild>
        <Link href="/saude/tfd/processos/novo">Novo processo</Link>
      </Button>
    </PermissionGate>
  )

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-3)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <ProcessoViewToggle value={viewMode} onChange={handleViewModeChange} />
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
        <PermissionGate session={session} permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}>
          <Button variant="primary" asChild className="w-full md:w-auto">
            <Link href="/saude/tfd/processos/novo">Novo processo</Link>
          </Button>
        </PermissionGate>
      </div>

      {effectiveViewMode === 'table' ? (
        <DataTable
          data={tableData}
          columns={columns}
          pagination={{ page, perPage, total }}
          onPaginationChange={handlePaginationChange}
          onRowClick={handleRowClick}
          emptyMessage="Nenhum processo encontrado"
          emptyDescription="Ajuste os filtros ou abra um novo processo para iniciar o fluxo TFD."
          emptyCta={emptyCta}
        />
      ) : null}

      {effectiveViewMode === 'kanban' ? (
        items.length === 0 ? (
          <EmptyState
            titulo="Nenhum processo encontrado"
            descricao="Ajuste os filtros ou abra um novo processo para iniciar o fluxo TFD."
            cta={emptyCta}
          />
        ) : (
          <>
            <ProcessoKanbanView items={items} mostrarEncerrados={mostrarEncerrados} />
            <ProcessoListaPaginacao {...paginationProps} />
          </>
        )
      ) : null}

      {effectiveViewMode === 'list' ? (
        items.length === 0 ? (
          <EmptyState
            titulo="Nenhum processo encontrado"
            descricao="Ajuste os filtros ou abra um novo processo para iniciar o fluxo TFD."
            cta={emptyCta}
          />
        ) : (
          <>
            <ProcessoListaCompactaView items={items} />
            <ProcessoListaPaginacao {...paginationProps} />
          </>
        )
      ) : null}
    </div>
  )
}
