'use client'

import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import {
  Button,
  DataTable,
  EmptyState,
  ProtocoloBadge,
  type ColumnDef,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ViagemStatusBadge } from '../../components/viagem-status-badge'
import { ViagemAcoesCelula } from './viagem-acoes-celula'
import { ViagemKanbanView } from './viagem-kanban-view'
import { ViagemListaCompactaView } from './viagem-lista-compacta-view'
import { ViagemListaPaginacao } from './viagem-lista-paginacao'
import {
  formatDataSaidaCurta,
  labelRota,
  labelVeiculoAbreviado,
  motoristaNaoAlocado,
  tooltipRota,
  viagemDetalheHref,
} from './viagem-lista-utils'
import { ViagemPassageirosCelula } from './viagem-passageiros-celula'
import { getViagemTemporalBadge } from './viagem-temporal-badge'
import {
  TFD_VIAGENS_VIEW_STORAGE_KEY,
  ViagemViewToggle,
  type ViagemViewMode,
} from './viagem-view-toggle'

// BLOCO-10-VIAGENS
const VIAGENS_BASE = '/saude/tfd/viagens'

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

function isValidViewMode(value: string | null): value is ViagemViewMode {
  return value === 'table' || value === 'kanban' || value === 'list'
}

export interface ViagemListaProps {
  items: ViagemTfdListItem[]
  total: number
  page: number
  perPage: number
  session: SaudeMunicSession
  podeNovaViagem: boolean
  temFiltrosServidor: boolean
}

export function ViagemLista({
  items,
  total,
  page,
  perPage,
  session,
  podeNovaViagem,
  temFiltrosServidor,
}: ViagemListaProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isMobile = useMediaQuery('(max-width: 767px)')

  const [viewMode, setViewMode] = useState<ViagemViewMode>('table')
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(TFD_VIAGENS_VIEW_STORAGE_KEY)
    if (isValidViewMode(stored)) {
      setViewMode(stored)
    }
  }, [])

  const handleViewModeChange = useCallback((nextView: ViagemViewMode) => {
    setViewMode(nextView)
    window.localStorage.setItem(TFD_VIAGENS_VIEW_STORAGE_KEY, nextView)
  }, [])

  const effectiveViewMode: ViagemViewMode = isMobile ? 'list' : viewMode

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
    (row: ViagemTfdListItem) => {
      router.push(viagemDetalheHref(row.id))
    },
    [router]
  )

  const columns = useMemo<ColumnDef<ViagemTfdListItem>[]>(
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
        id: 'dataSaida',
        header: 'Data saída',
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <span className="whitespace-nowrap text-[length:var(--text-sm)] text-[var(--color-text)]">
              {formatDataSaidaCurta(row.original.dataSaida)}
            </span>
            {getViagemTemporalBadge(row.original.dataSaida, row.original.status)}
          </div>
        ),
      },
      {
        id: 'rota',
        header: 'Origem → Destino',
        cell: ({ row }) => (
          <span
            className="block max-w-52 truncate text-[length:var(--text-sm)] text-[var(--color-text)]"
            title={tooltipRota(row.original)}
          >
            {labelRota(row.original)}
          </span>
        ),
      },
      {
        id: 'veiculo',
        header: 'Veículo',
        cell: ({ row }) => {
          const label = labelVeiculoAbreviado(row.original.veiculo)
          if (!label) {
            return (
              <span className="text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
                —
              </span>
            )
          }
          return (
            <span className="text-[length:var(--text-xs)] text-[var(--color-text)]">{label}</span>
          )
        },
      },
      {
        id: 'motorista',
        header: 'Motorista',
        cell: ({ row }) => {
          if (row.original.motorista) {
            return (
              <span className="text-[length:var(--text-xs)] text-[var(--color-text)]">
                {row.original.motorista.nome}
              </span>
            )
          }
          if (motoristaNaoAlocado(row.original.status, row.original.motorista)) {
            return (
              <span className="text-[length:var(--text-xs)] text-[var(--color-warning)]">
                Não alocado
              </span>
            )
          }
          return (
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
              —
            </span>
          )
        },
      },
      {
        id: 'passageiros',
        header: 'Passageiros',
        cell: ({ row }) => <ViagemPassageirosCelula item={row.original} />,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <ViagemStatusBadge status={row.original.status} size="sm" />,
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => <ViagemAcoesCelula item={row.original} />,
      },
    ],
    []
  )

  const paginationProps = { page, perPage, total, onPaginationChange: handlePaginationChange }

  const emptyCta = podeNovaViagem ? (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
      <Button variant="primary" asChild>
        <Link href={`${VIAGENS_BASE}/nova`}>Nova viagem</Link>
      </Button>
    </PermissionGate>
  ) : undefined

  const emptyState =
    total === 0 ? (
      <EmptyState
        titulo={
          temFiltrosServidor
            ? 'Nenhuma viagem encontrada para os filtros selecionados.'
            : 'Nenhuma viagem cadastrada.'
        }
        descricao={
          temFiltrosServidor
            ? 'Ajuste os filtros ou limpe-os para ampliar a busca.'
            : 'Crie uma viagem a partir de um agendamento aprovado.'
        }
        cta={emptyCta}
      />
    ) : null

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-3)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <ViagemViewToggle value={viewMode} onChange={handleViewModeChange} />
          {effectiveViewMode === 'kanban' ? (
            <label className="hidden cursor-pointer items-center gap-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)] md:inline-flex">
              <input
                type="checkbox"
                className="size-4 rounded border-[var(--color-border)]"
                checked={mostrarCanceladas}
                onChange={(event) => setMostrarCanceladas(event.target.checked)}
              />
              Mostrar canceladas
            </label>
          ) : null}
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {total} registros
          </p>
        </div>
        {podeNovaViagem ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
            <Button variant="primary" asChild className="w-full md:w-auto">
              <Link href={`${VIAGENS_BASE}/nova`}>Nova viagem</Link>
            </Button>
          </PermissionGate>
        ) : null}
      </div>

      {emptyState}

      {total > 0 && effectiveViewMode === 'table' ? (
        <DataTable
          data={items}
          columns={columns}
          pagination={{ page, perPage, total }}
          onPaginationChange={handlePaginationChange}
          onRowClick={handleRowClick}
          emptyMessage="Nenhuma viagem encontrada."
        />
      ) : null}

      {total > 0 && effectiveViewMode === 'kanban' ? (
        <>
          <ViagemKanbanView items={items} mostrarCanceladas={mostrarCanceladas} />
          <ViagemListaPaginacao {...paginationProps} />
        </>
      ) : null}

      {total > 0 && effectiveViewMode === 'list' ? (
        <>
          <ViagemListaCompactaView items={items} />
          <ViagemListaPaginacao {...paginationProps} />
        </>
      ) : null}
    </div>
  )
}
