'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import { Button, EmptyState } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ProcessoKanbanView } from './processo-kanban-view'
import { ProcessoListaCompactaView } from './processo-lista-compacta-view'
import { ProcessoListaPaginacao } from './processo-lista-paginacao'
import { agruparProcessosPorPaciente } from './processo-paciente-grupo'
import { ProcessoTabelaAgrupadaView } from './processo-tabela-agrupada-view'
import {
  ProcessoViewToggle,
  TFD_PROCESSOS_VIEW_STORAGE_KEY,
  type ProcessoViewMode,
} from './processo-view-toggle'

// BLOCO-8-PROCESSOS
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
  mostrarEncerradosInicial?: boolean
}

export function ProcessoLista({
  items,
  total,
  page,
  perPage,
  session,
  podeNovaSolicitacao,
  mostrarEncerradosInicial = false,
}: ProcessoListaProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isMobile = useMediaQuery('(max-width: 767px)')

  const [viewMode, setViewMode] = useState<ProcessoViewMode>('table')
  const [mostrarEncerrados, setMostrarEncerrados] = useState(mostrarEncerradosInicial)

  useEffect(() => {
    const stored = window.localStorage.getItem(TFD_PROCESSOS_VIEW_STORAGE_KEY)
    if (isValidViewMode(stored)) {
      setViewMode(stored)
    }
  }, [])

  useEffect(() => {
    setMostrarEncerrados(mostrarEncerradosInicial)
  }, [mostrarEncerradosInicial])

  const handleViewModeChange = useCallback((nextView: ProcessoViewMode) => {
    setViewMode(nextView)
    window.localStorage.setItem(TFD_PROCESSOS_VIEW_STORAGE_KEY, nextView)
  }, [])

  const effectiveViewMode: ProcessoViewMode = isMobile ? 'list' : viewMode

  const grupos = useMemo(() => agruparProcessosPorPaciente(items), [items])
  const totalPacientesPagina = grupos.length
  const totalProcessosAtivosPagina = grupos.reduce(
    (acc, grupo) => acc + grupo.processosAtivos.length,
    0
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

  const handleMostrarEncerradosChange = useCallback(
    (checked: boolean) => {
      setMostrarEncerrados(checked)
      const currentSearch =
        typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : ''
      const query = buildQueryString(currentSearch, {
        mostrarEncerrados: checked ? 'true' : undefined,
        page: undefined,
      })
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router]
  )

  const paginationProps = { page, perPage, total, onPaginationChange: handlePaginationChange }

  const emptyCta = (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}>
      <Button variant="primary" asChild>
        <Link href="/saude/tfd/processos/novo">Novo processo</Link>
      </Button>
    </PermissionGate>
  )

  const resumoRegistros = mostrarEncerrados
    ? `${totalPacientesPagina} paciente${totalPacientesPagina === 1 ? '' : 's'} nesta página · ${items.length} processo${items.length === 1 ? '' : 's'}`
    : `${totalPacientesPagina} paciente${totalPacientesPagina === 1 ? '' : 's'} nesta página · ${totalProcessosAtivosPagina} em andamento · ${total} no total`

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-3)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <ProcessoViewToggle value={viewMode} onChange={handleViewModeChange} />
          <label className="inline-flex cursor-pointer items-center gap-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--color-border)]"
              checked={mostrarEncerrados}
              onChange={(event) => handleMostrarEncerradosChange(event.target.checked)}
            />
            Mostrar encerrados
          </label>
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {resumoRegistros}
          </p>
        </div>
        <PermissionGate session={session} permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}>
          <Button variant="primary" asChild className="w-full md:w-auto">
            <Link href="/saude/tfd/processos/novo">Novo processo</Link>
          </Button>
        </PermissionGate>
      </div>

      {effectiveViewMode === 'table' ? (
        <>
          <ProcessoTabelaAgrupadaView
            items={items}
            podeNovaSolicitacao={podeNovaSolicitacao}
            mostrarEncerrados={mostrarEncerrados}
            emptyCta={emptyCta}
          />
          {items.length > 0 ? <ProcessoListaPaginacao {...paginationProps} /> : null}
        </>
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
            <ProcessoListaCompactaView
              items={items}
              podeNovaSolicitacao={podeNovaSolicitacao}
              mostrarEncerrados={mostrarEncerrados}
            />
            <ProcessoListaPaginacao {...paginationProps} />
          </>
        )
      ) : null}
    </div>
  )
}
