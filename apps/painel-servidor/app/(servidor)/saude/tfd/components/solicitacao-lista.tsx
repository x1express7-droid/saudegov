'use client'

import { exportarSolicitacoesTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import { TfdSolicitacaoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Badge,
  Button,
  DataTable,
  ProtocoloBadge,
  StatusBadge,
  TFD_STATUS_CONFIG,
  TFD_URGENCIA_CONFIG,
  UrgenciaBadge,
  type ColumnDef,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { SolicitacaoAcoesCelula } from './solicitacao-acoes-celula'
import { SolicitacaoKanbanView } from './solicitacao-kanban-view'
import { SolicitacaoListaCompactaView } from './solicitacao-lista-compacta-view'
import { SolicitacaoListaPaginacao } from './solicitacao-lista-paginacao'
import { TfdExportCsvButton } from './tfd-export-csv-button'
import {
  SolicitacaoViewToggle,
  TFD_SOLICITACOES_VIEW_STORAGE_KEY,
  type SolicitacaoViewMode,
} from './solicitacao-view-toggle'

// BLOCO-6-REVISADO
const TFD_DETAIL_BASE = '/saude/tfd'
const DEFAULT_PER_PAGE = 20

const STATUS_VALUES = new Set<string>([
  'RASCUNHO',
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
  'NEGADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
  'CANCELADO',
])

const URGENCIA_VALUES = new Set<string>([
  'NAO_AGUDA',
  'BAIXA',
  'INTERMEDIARIA',
  'GRAVE',
  'MUITO_URGENTE',
])

function formatDataAbertura(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function asTfdUrgencia(value: string): TfdUrgencia {
  return value in TFD_URGENCIA_CONFIG ? (value as TfdUrgencia) : 'NAO_AGUDA'
}

function asTfdStatus(value: string): TfdStatus {
  return value in TFD_STATUS_CONFIG ? (value as TfdStatus) : 'RASCUNHO'
}

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

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

export interface SolicitacaoListaProps {
  items: TfdSolicitacaoListItem[]
  total: number
  session: SaudeMunicSession
  pacienteBusca?: string
}

function buildExportFiltros(searchParams: URLSearchParams) {
  const status = searchParams.get('status')?.trim()
  const urgencia = searchParams.get('urgencia')?.trim()
  const protocolo = searchParams.get('protocolo')?.trim()

  return {
    ...(status && STATUS_VALUES.has(status) ? { status } : {}),
    ...(urgencia && URGENCIA_VALUES.has(urgencia) ? { urgencia } : {}),
    ...(protocolo ? { protocolo } : {}),
  }
}

function isValidViewMode(value: string | null): value is SolicitacaoViewMode {
  return value === 'table' || value === 'kanban' || value === 'list'
}

export function SolicitacaoLista({
  items,
  total,
  session,
  pacienteBusca = '',
}: SolicitacaoListaProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')

  const [viewMode, setViewMode] = useState<SolicitacaoViewMode>('table')
  const [mostrarEncerradas, setMostrarEncerradas] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(TFD_SOLICITACOES_VIEW_STORAGE_KEY)
    if (isValidViewMode(stored)) {
      setViewMode(stored)
    }
  }, [])

  const handleViewModeChange = useCallback((nextView: SolicitacaoViewMode) => {
    setViewMode(nextView)
    window.localStorage.setItem(TFD_SOLICITACOES_VIEW_STORAGE_KEY, nextView)
  }, [])

  const effectiveViewMode: SolicitacaoViewMode = isMobile ? 'list' : viewMode

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const perPage = Math.max(
    1,
    Number.parseInt(searchParams.get('perPage') ?? String(DEFAULT_PER_PAGE), 10) ||
      DEFAULT_PER_PAGE
  )

  const filteredItems = useMemo(() => {
    const query = normalizeSearch(pacienteBusca)
    if (!query) {
      return items
    }

    return items.filter((item) => normalizeSearch(item.paciente.nome).includes(query))
  }, [items, pacienteBusca])

  const handlePaginationChange = useCallback(
    (nextPage: number) => {
      const query = buildQueryString(searchParams, {
        page: nextPage <= 1 ? undefined : String(nextPage),
      })
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router, searchParams]
  )

  const handleRowClick = useCallback(
    (row: TfdSolicitacaoListItem) => {
      router.push(`${TFD_DETAIL_BASE}/${row.id}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<TfdSolicitacaoListItem>[]>(() => {
    const baseColumns: ColumnDef<TfdSolicitacaoListItem>[] = [
      {
        id: 'protocolo',
        header: 'Solicitação',
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
            {row.original.paciente.nome}
          </span>
        ),
      },
      {
        id: 'especialidade',
        header: 'Especialidade',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {row.original.especialidade}
          </span>
        ),
      },
      {
        id: 'urgencia',
        header: 'Urgência',
        cell: ({ row }) => (
          <UrgenciaBadge urgencia={asTfdUrgencia(row.original.urgencia)} size="sm" />
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={asTfdStatus(row.original.status)} />,
      },
    ]

    if (!isTablet) {
      baseColumns.push({
        id: 'posicaoFila',
        header: 'Posição',
        cell: ({ row }) => {
          const posicao = row.original.posicaoFila
          if (posicao == null) {
            return <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">—</span>
          }
          return (
            <Badge variant="gray" size="sm">
              #{posicao}
            </Badge>
          )
        },
      })
    }

    baseColumns.push(
      {
        id: 'criadoEm',
        header: 'Data',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {formatDataAbertura(row.original.criadoEm)}
          </span>
        ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => <SolicitacaoAcoesCelula item={row.original} session={session} />,
      }
    )

    return baseColumns
  }, [isTablet, session])

  const pacienteFiltrado = pacienteBusca.trim().length > 0
  const paginationProps = { page, perPage, total, onPaginationChange: handlePaginationChange }

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-3)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <SolicitacaoViewToggle value={viewMode} onChange={handleViewModeChange} />
          {effectiveViewMode === 'kanban' ? (
            <label className="hidden cursor-pointer items-center gap-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)] md:inline-flex">
              <input
                type="checkbox"
                className="size-4 rounded border-[var(--color-border)]"
                checked={mostrarEncerradas}
                onChange={(event) => setMostrarEncerradas(event.target.checked)}
              />
              Mostrar encerradas
            </label>
          ) : null}
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {total} registros
          </p>
        </div>
        <TfdExportCsvButton
          session={session}
          onExport={() => exportarSolicitacoesTfdCsv(buildExportFiltros(searchParams))}
        />
      </div>

      {pacienteFiltrado ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          {filteredItems.length} solicitação(ões) nesta página correspondem à busca por paciente.
        </p>
      ) : null}

      {effectiveViewMode === 'table' ? (
        <>
          <DataTable
            data={filteredItems}
            columns={columns}
            pagination={{ page, perPage, total }}
            onPaginationChange={handlePaginationChange}
            onRowClick={handleRowClick}
            emptyMessage="Nenhuma solicitação encontrada"
            emptyDescription="Ajuste os filtros ou abra uma nova solicitação para iniciar o fluxo TFD."
            emptyCta={
              <Button variant="primary" asChild>
                <Link href="/saude/tfd/nova">Nova solicitação</Link>
              </Button>
            }
          />
        </>
      ) : null}

      {effectiveViewMode === 'kanban' ? (
        <SolicitacaoKanbanView items={filteredItems} mostrarEncerradas={mostrarEncerradas} />
      ) : null}

      {effectiveViewMode === 'list' ? (
        <>
          <SolicitacaoListaCompactaView items={filteredItems} />
          <SolicitacaoListaPaginacao {...paginationProps} />
        </>
      ) : null}
    </div>
  )
}
