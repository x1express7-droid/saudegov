'use client'

import type { TfdPacienteVinculadoItem } from '@saude/mod-saude-tfd/client'
import { Badge, Button, DataTable, EmptyState, type ColumnDef } from '@saude/ui'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { PacientesListaPaginacao } from './pacientes-lista-paginacao'
import { PacienteAcoesCelula } from './paciente-acoes-celula'
import { PacientesFiltros, type PacienteStatusFiltro } from './pacientes-filtros'
import { PacientesKanbanView } from './pacientes-kanban-view'
import { PacientesListaCompactaView } from './pacientes-lista-compacta-view'
import {
  PacientesViewToggle,
  TFD_PACIENTES_VIEW_STORAGE_KEY,
  type PacientesViewMode,
} from './pacientes-view-toggle'

// BLOCO-7-PACIENTES
const PACIENTE_BASE = '/saude/tfd/pacientes'

function formatDataVinculo(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
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

function isValidViewMode(value: string | null): value is PacientesViewMode {
  return value === 'table' || value === 'kanban' || value === 'list'
}

function matchesStatusFiltro(item: TfdPacienteVinculadoItem, filtro: PacienteStatusFiltro): boolean {
  if (filtro === 'all') {
    return true
  }
  if (filtro === 'ativo') {
    return item.ativo
  }
  return !item.ativo
}

export interface PacientesListaProps {
  items: TfdPacienteVinculadoItem[]
  total: number
  page: number
  perPage: number
  podeVerPerfilPaciente: boolean
  podeEditarPaciente: boolean
  podeNovaSolicitacao: boolean
  podeCadastrarPaciente: boolean
}

export function PacientesLista({
  items,
  total,
  page,
  perPage,
  podeVerPerfilPaciente,
  podeEditarPaciente,
  podeNovaSolicitacao,
  podeCadastrarPaciente,
}: PacientesListaProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isMobile = useMediaQuery('(max-width: 767px)')

  const [viewMode, setViewMode] = useState<PacientesViewMode>('table')
  const [nomeBusca, setNomeBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<PacienteStatusFiltro>('all')

  useEffect(() => {
    const stored = window.localStorage.getItem(TFD_PACIENTES_VIEW_STORAGE_KEY)
    if (isValidViewMode(stored)) {
      setViewMode(stored)
    }
  }, [])

  const handleViewModeChange = useCallback((nextView: PacientesViewMode) => {
    setViewMode(nextView)
    window.localStorage.setItem(TFD_PACIENTES_VIEW_STORAGE_KEY, nextView)
  }, [])

  const effectiveViewMode: PacientesViewMode = isMobile ? 'list' : viewMode

  const filteredItems = useMemo(() => {
    const query = normalizeSearch(nomeBusca)

    return items.filter((item) => {
      if (!matchesStatusFiltro(item, statusFiltro)) {
        return false
      }
      if (!query) {
        return true
      }
      return normalizeSearch(item.nome).includes(query)
    })
  }, [items, nomeBusca, statusFiltro])

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
    (row: TfdPacienteVinculadoItem) => {
      if (podeVerPerfilPaciente) {
        router.push(`${PACIENTE_BASE}/${row.id}`)
      }
    },
    [podeVerPerfilPaciente, router]
  )

  const columns = useMemo<ColumnDef<TfdPacienteVinculadoItem>[]>(
    () => [
      {
        id: 'nome',
        header: 'Nome',
        cell: ({ row }) =>
          podeVerPerfilPaciente ? (
            <Link
              href={`${PACIENTE_BASE}/${row.original.id}`}
              className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.nome}
            </Link>
          ) : (
            <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
              {row.original.nome}
            </span>
          ),
      },
      {
        id: 'cns',
        header: 'CNS',
        cell: ({ row }) => (
          <span className="font-mono text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {row.original.cnsMascarado ?? '—'}
          </span>
        ),
      },
      {
        id: 'vinculadoEm',
        header: 'Data de vínculo',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {formatDataVinculo(row.original.vinculadoEm)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          row.original.ativo ? (
            <Badge variant="green" size="sm">
              Ativo
            </Badge>
          ) : (
            <Badge variant="gray" size="sm">
              Inativo
            </Badge>
          ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <PacienteAcoesCelula
            item={row.original}
            podeVerPerfilPaciente={podeVerPerfilPaciente}
            podeEditarPaciente={podeEditarPaciente}
            podeNovaSolicitacao={podeNovaSolicitacao}
          />
        ),
      },
    ],
    [podeEditarPaciente, podeNovaSolicitacao, podeVerPerfilPaciente]
  )

  const filtrosAtivos = nomeBusca.trim().length > 0 || statusFiltro !== 'all'
  const listaTotalmenteVazia = total === 0
  const semResultadosFiltro = !listaTotalmenteVazia && filteredItems.length === 0

  const paginationProps = { page, perPage, total, onPaginationChange: handlePaginationChange }

  const emptyStateCta =
    podeCadastrarPaciente ? (
      <Button variant="primary" asChild>
        <Link href={`${PACIENTE_BASE}/novo`}>+ Novo paciente</Link>
      </Button>
    ) : undefined

  function renderEmptyState() {
    if (listaTotalmenteVazia) {
      return (
        <EmptyState
          titulo="Nenhum paciente cadastrado."
          descricao="Clique em '+ Novo paciente' para começar."
          cta={emptyStateCta}
        />
      )
    }

    if (semResultadosFiltro) {
      return (
        <EmptyState
          titulo="Nenhum paciente encontrado."
          descricao="Ajuste os filtros ou cadastre um novo paciente."
          cta={emptyStateCta}
        />
      )
    }

    return null
  }

  const emptyState = renderEmptyState()

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <PacientesFiltros
        nomeBusca={nomeBusca}
        onNomeBuscaChange={setNomeBusca}
        statusFiltro={statusFiltro}
        onStatusFiltroChange={setStatusFiltro}
      />

      <div className="flex flex-col gap-[var(--space-3)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <PacientesViewToggle value={viewMode} onChange={handleViewModeChange} />
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {total} registros
          </p>
        </div>
      </div>

      {filtrosAtivos && filteredItems.length > 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          {filteredItems.length} paciente(s) nesta página correspondem aos filtros aplicados.
        </p>
      ) : null}

      {emptyState}

      {!emptyState && effectiveViewMode === 'table' ? (
        <DataTable
          data={filteredItems}
          columns={columns}
          pagination={{ page, perPage, total }}
          onPaginationChange={handlePaginationChange}
          onRowClick={podeVerPerfilPaciente ? handleRowClick : undefined}
          emptyMessage="Nenhum paciente encontrado."
          emptyDescription="Ajuste os filtros ou cadastre um novo paciente."
          emptyCta={emptyStateCta}
        />
      ) : null}

      {!emptyState && effectiveViewMode === 'kanban' ? (
        <PacientesKanbanView items={filteredItems} podeVerPerfilPaciente={podeVerPerfilPaciente} />
      ) : null}

      {!emptyState && effectiveViewMode === 'list' ? (
        <>
          <PacientesListaCompactaView
            items={filteredItems}
            podeVerPerfilPaciente={podeVerPerfilPaciente}
          />
          <PacientesListaPaginacao {...paginationProps} />
        </>
      ) : null}
    </div>
  )
}
