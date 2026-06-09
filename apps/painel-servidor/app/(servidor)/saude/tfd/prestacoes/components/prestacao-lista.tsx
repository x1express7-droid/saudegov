'use client'

import { exportarPrestacoesTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import type { TfdPrestacaoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { EmptyState } from '@saude/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TfdExportCsvButton } from '../../components/tfd-export-csv-button'
import { PrestacaoInstrucaoCard } from './prestacao-instrucao-card'
import { PrestacaoKpiCards } from './prestacao-kpi-cards'
import { PrestacaoListaCompactaView } from './prestacao-lista-compacta-view'
import { PrestacaoListaPaginacao } from './prestacao-lista-paginacao'
import { PrestacaoTabelaView } from './prestacao-tabela-view'
import { normalizeSearch } from './prestacao-utils'
import {
  PrestacaoViewToggle,
  TFD_PRESTACOES_VIEW_STORAGE_KEY,
  type PrestacaoViewMode,
} from './prestacao-view-toggle'

// BLOCO-14-PRESTACOES
const DEFAULT_PER_PAGE = 20

const PRESTACAO_STATUS_VALUES = new Set<string>(['PENDENTE', 'ENVIADA', 'APROVADA', 'REJEITADA'])

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

function isValidViewMode(value: string | null): value is PrestacaoViewMode {
  return value === 'table' || value === 'list'
}

export interface PrestacaoListaProps {
  items: TfdPrestacaoListItem[]
  total: number
  session: SaudeMunicSession
}

function buildExportFiltros(searchParams: URLSearchParams) {
  const status = searchParams.get('status')?.trim()
  return {
    ...(status && PRESTACAO_STATUS_VALUES.has(status) ? { status } : {}),
  }
}

export function PrestacaoLista({ items, total, session }: PrestacaoListaProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 767px)')

  const [viewMode, setViewMode] = useState<PrestacaoViewMode>('table')

  useEffect(() => {
    const stored = window.localStorage.getItem(TFD_PRESTACOES_VIEW_STORAGE_KEY)
    if (isValidViewMode(stored)) {
      setViewMode(stored)
    }
  }, [])

  const handleViewModeChange = useCallback((nextView: PrestacaoViewMode) => {
    setViewMode(nextView)
    window.localStorage.setItem(TFD_PRESTACOES_VIEW_STORAGE_KEY, nextView)
  }, [])

  const effectiveViewMode: PrestacaoViewMode = isMobile ? 'list' : viewMode

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const perPage = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get('perPage') ?? String(DEFAULT_PER_PAGE), 10) ||
      DEFAULT_PER_PAGE)
  )

  const pacienteFiltro = searchParams.get('paciente')?.trim() ?? ''
  const mesFiltro = searchParams.get('mes')?.trim() ?? ''
  const statusFiltro = searchParams.get('status')?.trim() ?? ''

  const temFiltros = Boolean(
    (statusFiltro && PRESTACAO_STATUS_VALUES.has(statusFiltro)) ||
      pacienteFiltro ||
      mesFiltro
  )

  const itensFiltrados = useMemo(() => {
    let resultado = items

    if (pacienteFiltro) {
      const busca = normalizeSearch(pacienteFiltro)
      resultado = resultado.filter((item) =>
        normalizeSearch(item.paciente.nome).includes(busca)
      )
    }

    if (mesFiltro) {
      resultado = resultado.filter((item) => item.prazoEnvioAt.startsWith(mesFiltro))
    }

    return resultado
  }, [items, mesFiltro, pacienteFiltro])

  const temPendentes = useMemo(
    () => itensFiltrados.some((item) => item.status === 'PENDENTE'),
    [itensFiltrados]
  )

  const totalPaginacao = pacienteFiltro || mesFiltro ? itensFiltrados.length : total
  const listaVazia = total === 0 && items.length === 0 && !temFiltros

  const irParaPagina = useCallback(
    (novaPagina: number) => {
      const query = buildQueryString(searchParams, { page: String(novaPagina) })
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <PrestacaoKpiCards items={itensFiltrados} />

      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
        <div className="hidden md:block">
          <PrestacaoViewToggle value={viewMode} onChange={handleViewModeChange} />
        </div>
        <TfdExportCsvButton
          session={session}
          onExport={() => exportarPrestacoesTfdCsv(buildExportFiltros(searchParams))}
        />
      </div>

      {listaVazia ? (
        <EmptyState
          titulo="Nenhuma prestação de contas ainda."
          descricao="As prestações são criadas automaticamente quando uma viagem é concluída."
        />
      ) : itensFiltrados.length === 0 ? (
        <EmptyState
          titulo="Nenhuma prestação encontrada para os filtros selecionados."
          descricao="Ajuste os filtros ou limpe a busca para ver mais resultados."
        />
      ) : (
        <>
          {temPendentes ? <PrestacaoInstrucaoCard /> : null}

          {effectiveViewMode === 'table' ? (
            <PrestacaoTabelaView items={itensFiltrados} />
          ) : (
            <PrestacaoListaCompactaView items={itensFiltrados} />
          )}

          <PrestacaoListaPaginacao
            page={page}
            perPage={perPage}
            total={totalPaginacao}
            onPaginationChange={irParaPagina}
          />
        </>
      )}
    </div>
  )
}
