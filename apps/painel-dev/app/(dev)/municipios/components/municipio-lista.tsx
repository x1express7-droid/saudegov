'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import type { MunicipioListItem } from '../../../../lib/queries/get-municipios'

export interface MunicipioListaFiltros {
  busca: string
  ativo: 'todos' | 'ativo' | 'suspenso'
  page: number
  perPage: number
}

interface MunicipioListaProps {
  items: MunicipioListItem[]
  total: number
  filtros: MunicipioListaFiltros
}

function countActiveModules(modules: Record<string, Record<string, boolean>>): number {
  let count = 0
  for (const modulos of Object.values(modules)) {
    for (const ativo of Object.values(modulos)) {
      if (ativo) {
        count += 1
      }
    }
  }
  return count
}

function formatDisplayDomain(item: MunicipioListItem): string {
  return item.domainCustom ?? item.domain
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function buildQueryString(
  base: MunicipioListaFiltros,
  overrides: Partial<MunicipioListaFiltros>
): string {
  const next = { ...base, ...overrides }
  const params = new URLSearchParams()

  if (next.busca.trim()) {
    params.set('busca', next.busca.trim())
  }

  if (next.ativo === 'ativo') {
    params.set('ativo', 'true')
  } else if (next.ativo === 'suspenso') {
    params.set('ativo', 'false')
  }

  if (next.page > 1) {
    params.set('page', String(next.page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function MunicipioLista({ items, total, filtros }: MunicipioListaProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [buscaInput, setBuscaInput] = useState(filtros.busca)

  const totalPages = Math.max(1, Math.ceil(total / filtros.perPage))
  const hasPrev = filtros.page > 1
  const hasNext = filtros.page < totalPages

  const navigate = useCallback(
    (overrides: Partial<MunicipioListaFiltros>) => {
      const href = `/municipios${buildQueryString(filtros, overrides)}`
      startTransition(() => {
        router.push(href)
      })
    },
    [filtros, router]
  )

  useEffect(() => {
    setBuscaInput(filtros.busca)
  }, [filtros.busca])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmed = buscaInput.trim()
      const current = searchParams.get('busca') ?? ''
      if (trimmed === current) {
        return
      }
      navigate({ busca: buscaInput, page: 1 })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [buscaInput, navigate, searchParams])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Municípios</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {total} município{total === 1 ? '' : 's'} cadastrado{total === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/municipios/novo"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Novo município
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
          Buscar
          <input
            type="search"
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Nome ou slug"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={filtros.ativo}
            onChange={(e) =>
              navigate({
                ativo: e.target.value as MunicipioListaFiltros['ativo'],
                page: 1,
              })
            }
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="suspenso">Suspenso</option>
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          Nenhum município cadastrado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">UF</th>
                <th className="px-4 py-3 text-left font-medium">Domínio</th>
                <th className="px-4 py-3 text-left font-medium">Módulos ativos</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Criado em</th>
                <th className="px-4 py-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {items.map((item) => (
                <tr key={item.id} className="bg-white dark:bg-neutral-950">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.nome}</div>
                    <div className="font-mono text-xs text-neutral-500">{item.slug}</div>
                  </td>
                  <td className="px-4 py-3">{item.uf ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDisplayDomain(item)}</td>
                  <td className="px-4 py-3">{countActiveModules(item.modules)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        item.ativo
                          ? 'inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200'
                          : 'inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                      }
                    >
                      {item.ativo ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatCreatedAt(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/municipios/${item.id}`}
                      className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                    >
                      Configurar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
          <span>
            Página {filtros.page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {hasPrev ? (
              <button
                type="button"
                onClick={() => navigate({ page: filtros.page - 1 })}
                className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Anterior
              </button>
            ) : (
              <span className="rounded border border-neutral-200 px-3 py-1.5 opacity-50 dark:border-neutral-800">
                Anterior
              </span>
            )}
            {hasNext ? (
              <button
                type="button"
                onClick={() => navigate({ page: filtros.page + 1 })}
                className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Próxima
              </button>
            ) : (
              <span className="rounded border border-neutral-200 px-3 py-1.5 opacity-50 dark:border-neutral-800">
                Próxima
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
