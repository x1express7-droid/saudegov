'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { PlatformFeatureItem } from '../../../../lib/queries/get-platform-features'

const SISTEMAS_FILTRO = [
  { value: '', label: 'Todos os sistemas' },
  { value: 'plataforma', label: 'plataforma' },
  { value: 'saude', label: 'saude' },
] as const

const MODULOS_FILTRO = [
  { value: '', label: 'Todos os módulos' },
  { value: 'municipios', label: 'municipios' },
  { value: 'auditoria', label: 'auditoria' },
  { value: 'plataforma', label: 'plataforma' },
  { value: 'auth', label: 'auth' },
] as const

const STATUS_FILTRO = [
  { value: '', label: 'Todos os status' },
  { value: 'ativo', label: 'ativo' },
  { value: 'inativo', label: 'inativo' },
] as const

export interface PlatformFeatureListaFiltros {
  sistema: string
  modulo: string
  status: string
}

interface PlatformFeatureListaProps {
  items: PlatformFeatureItem[]
  total: number
  filtros: PlatformFeatureListaFiltros
}

function BoolIcon({ value }: { value: boolean }) {
  return (
    <span
      className={
        value
          ? 'font-semibold text-green-700 dark:text-green-400'
          : 'text-neutral-400 dark:text-neutral-500'
      }
      aria-label={value ? 'Sim' : 'Não'}
    >
      {value ? '✓' : '✗'}
    </span>
  )
}

function buildQueryString(
  base: PlatformFeatureListaFiltros,
  overrides: Partial<PlatformFeatureListaFiltros>
): string {
  const next = { ...base, ...overrides }
  const params = new URLSearchParams()

  if (next.sistema.trim()) {
    params.set('sistema', next.sistema.trim())
  }
  if (next.modulo.trim()) {
    params.set('modulo', next.modulo.trim())
  }
  if (next.status.trim()) {
    params.set('status', next.status.trim())
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function PlatformFeatureLista({ items, total, filtros }: PlatformFeatureListaProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function navigate(overrides: Partial<PlatformFeatureListaFiltros>) {
    const href = `/platform-features${buildQueryString(filtros, overrides)}`
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform features</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Registro de funcionalidades implementadas ({total} entrada{total === 1 ? '' : 's'}).
          Linhas em destaque indicam lacuna de paridade entre painéis.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[160px] flex-col gap-1 text-sm">
          Sistema
          <select
            value={filtros.sistema}
            onChange={(e) => navigate({ sistema: e.target.value })}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {SISTEMAS_FILTRO.map((opt) => (
              <option key={opt.value || 'todos'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[160px] flex-col gap-1 text-sm">
          Módulo
          <select
            value={filtros.modulo}
            onChange={(e) => navigate({ modulo: e.target.value })}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {MODULOS_FILTRO.map((opt) => (
              <option key={opt.value || 'todos'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[140px] flex-col gap-1 text-sm">
          Status
          <select
            value={filtros.status}
            onChange={(e) => navigate({ status: e.target.value })}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {STATUS_FILTRO.map((opt) => (
              <option key={opt.value || 'todos'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          Nenhuma funcionalidade registrada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Sistema</th>
                <th className="px-4 py-3 text-left font-medium">Módulo</th>
                <th className="px-4 py-3 text-left font-medium">Funcionalidade</th>
                <th className="px-4 py-3 text-left font-medium">Descrição</th>
                <th className="px-4 py-3 text-center font-medium">Painel Dev</th>
                <th className="px-4 py-3 text-center font-medium">Painel Servidor</th>
                <th className="px-4 py-3 text-left font-medium">Permissão</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Sprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {items.map((item) => {
                const hasParityGap = item.painelDev !== item.painelServidor

                return (
                  <tr
                    key={item.id}
                    className={
                      hasParityGap
                        ? 'bg-amber-50 dark:bg-amber-950/30'
                        : 'bg-white dark:bg-neutral-950'
                    }
                    title={
                      hasParityGap
                        ? 'Lacuna de paridade: funcionalidade presente em apenas um painel'
                        : undefined
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs">{item.sistema}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.modulo}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.funcionalidade}</td>
                    <td className="max-w-xs px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {item.descricao}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <BoolIcon value={item.painelDev} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <BoolIcon value={item.painelServidor} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {item.permissaoChave ?? '—'}
                    </td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.sprint ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
