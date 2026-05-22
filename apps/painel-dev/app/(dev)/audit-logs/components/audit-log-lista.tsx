'use client'

import { Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import type { AuditLogItem } from '../../../../lib/queries/get-audit-logs'

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'senha',
  'token',
  'cpf',
  'cns',
  'cid',
  'cid_principal',
  'diagnostico',
  'adminTempPassword',
])

const ACOES_FILTRO = [
  { value: '', label: 'Todas as ações' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'EXPORT', label: 'EXPORT' },
  { value: 'STATUS_ALTERADO', label: 'STATUS_ALTERADO' },
  { value: 'CANCELADO', label: 'CANCELADO' },
  { value: 'READ_SENSITIVE', label: 'READ_SENSITIVE' },
  { value: 'TENANT_CRIADO', label: 'TENANT_CRIADO' },
  { value: 'TENANT_SUSPENSO', label: 'TENANT_SUSPENSO' },
  { value: 'TENANT_REATIVADO', label: 'TENANT_REATIVADO' },
  { value: 'MODULO_ALTERADO', label: 'MODULO_ALTERADO' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGIN_FAILED', label: 'LOGIN_FAILED' },
  { value: 'PASSWORD_RESET_REQUESTED', label: 'PASSWORD_RESET_REQUESTED' },
] as const

const MODULOS_FILTRO = [
  { value: '', label: 'Todos os módulos' },
  { value: 'tfd', label: 'TFD (saude_tfd)' },
] as const

export interface AuditLogListaFiltros {
  tenantId: string
  entidade: string
  acao: string
  dataInicio: string
  dataFim: string
  userId: string
  modulo: string
  page: number
  perPage: number
}

interface AuditLogListaProps {
  items: AuditLogItem[]
  total: number
  tenantSlugMap: Record<string, string>
  filtros: AuditLogListaFiltros
}

function maskSensitiveValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key)) {
    return '[oculto]'
  }
  if (typeof value === 'string' && key.toLowerCase().includes('cpf') && value.length >= 4) {
    return `***${value.slice(-4)}`
  }
  if (typeof value === 'string' && key.toLowerCase().includes('cns') && value.length >= 4) {
    return `***${value.slice(-4)}`
  }
  return value
}

function maskPayloadForDisplay(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((entry) => maskPayloadForDisplay(entry))
  }
  if (typeof value === 'object') {
    const masked: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      masked[key] = maskSensitiveValue(key, maskPayloadForDisplay(entry))
    }
    return masked
  }
  return value
}

function formatPayloadJson(value: unknown | null): string {
  if (value === null || value === undefined) {
    return '—'
  }
  return JSON.stringify(maskPayloadForDisplay(value), null, 2)
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatTenantLabel(tenantId: string | null, slugMap: Record<string, string>): string {
  if (!tenantId) {
    return '—'
  }
  return slugMap[tenantId] ?? `${tenantId.slice(0, 8)}…`
}

function truncateEntidadeId(id: string | null): string {
  if (!id) {
    return '—'
  }
  if (id.length <= 12) {
    return id
  }
  return `${id.slice(0, 8)}…`
}

function buildQueryString(
  base: AuditLogListaFiltros,
  overrides: Partial<AuditLogListaFiltros>
): string {
  const next = { ...base, ...overrides }
  const params = new URLSearchParams()

  if (next.tenantId.trim()) {
    params.set('tenantId', next.tenantId.trim())
  }
  if (next.entidade.trim()) {
    params.set('entidade', next.entidade.trim())
  }
  if (next.acao.trim()) {
    params.set('acao', next.acao.trim())
  }
  if (next.dataInicio.trim()) {
    params.set('dataInicio', next.dataInicio.trim())
  }
  if (next.dataFim.trim()) {
    params.set('dataFim', next.dataFim.trim())
  }
  if (next.userId.trim()) {
    params.set('userId', next.userId.trim())
  }
  if (next.modulo.trim()) {
    params.set('modulo', next.modulo.trim())
  }
  if (next.page > 1) {
    params.set('page', String(next.page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function AuditLogLista({ items, total, tenantSlugMap, filtros }: AuditLogListaProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [tenantIdInput, setTenantIdInput] = useState(filtros.tenantId)
  const [entidadeInput, setEntidadeInput] = useState(filtros.entidade)
  const [userIdInput, setUserIdInput] = useState(filtros.userId)

  const totalPages = Math.max(1, Math.ceil(total / filtros.perPage))
  const hasPrev = filtros.page > 1
  const hasNext = filtros.page < totalPages

  const navigate = useCallback(
    (overrides: Partial<AuditLogListaFiltros>) => {
      const href = `/audit-logs${buildQueryString(filtros, overrides)}`
      startTransition(() => {
        router.push(href)
      })
    },
    [filtros, router]
  )

  useEffect(() => {
    setTenantIdInput(filtros.tenantId)
    setEntidadeInput(filtros.entidade)
    setUserIdInput(filtros.userId)
  }, [filtros.tenantId, filtros.entidade, filtros.userId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentTenant = searchParams.get('tenantId') ?? ''
      const currentEntidade = searchParams.get('entidade') ?? ''
      const currentUserId = searchParams.get('userId') ?? ''
      if (
        tenantIdInput.trim() === currentTenant &&
        entidadeInput.trim() === currentEntidade &&
        userIdInput.trim() === currentUserId
      ) {
        return
      }
      navigate({
        tenantId: tenantIdInput,
        entidade: entidadeInput,
        userId: userIdInput,
        page: 1,
      })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [tenantIdInput, entidadeInput, userIdInput, navigate, searchParams])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit logs</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Registro global de ações na plataforma ({total} registro{total === 1 ? '' : 's'})
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[160px] flex-col gap-1 text-sm">
          Ação
          <select
            value={filtros.acao}
            onChange={(e) => navigate({ acao: e.target.value, page: 1 })}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {ACOES_FILTRO.map((opt) => (
              <option key={opt.value || 'todas'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[160px] flex-col gap-1 text-sm">
          Módulo
          <select
            value={filtros.modulo}
            onChange={(e) => navigate({ modulo: e.target.value, page: 1 })}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {MODULOS_FILTRO.map((opt) => (
              <option key={opt.value || 'todos'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[150px] flex-col gap-1 text-sm">
          Data início
          <input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => navigate({ dataInicio: e.target.value, page: 1 })}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex min-w-[150px] flex-col gap-1 text-sm">
          Data fim
          <input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => navigate({ dataFim: e.target.value, page: 1 })}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm">
          Entidade
          <input
            type="text"
            value={entidadeInput}
            onChange={(e) => setEntidadeInput(e.target.value)}
            placeholder="Ex.: saude_tfd_solicitacao"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
          ID do usuário
          <input
            type="text"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="UUID do usuário"
            className="rounded border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
          ID do município (tenant)
          <input
            type="text"
            value={tenantIdInput}
            onChange={(e) => setTenantIdInput(e.target.value)}
            placeholder="UUID do tenant"
            className="rounded border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          Nenhum log encontrado para os filtros selecionados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data/hora</th>
                <th className="px-4 py-3 text-left font-medium">Município</th>
                <th className="px-4 py-3 text-left font-medium">Entidade</th>
                <th className="px-4 py-3 text-left font-medium">Ação</th>
                <th className="px-4 py-3 text-left font-medium">ID entidade</th>
                <th className="px-4 py-3 text-left font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {items.map((item) => {
                const isExpanded = expandedIds.has(item.id)
                const tenantTitle = item.tenantId ?? undefined

                return (
                  <Fragment key={item.id}>
                    <tr className="bg-white dark:bg-neutral-950">
                      <td className="whitespace-nowrap px-4 py-3">{formatDateTime(item.createdAt)}</td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        title={tenantTitle}
                      >
                        {formatTenantLabel(item.tenantId, tenantSlugMap)}
                      </td>
                      <td className="px-4 py-3">{item.entidade}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.acao}</td>
                      <td className="px-4 py-3 font-mono text-xs" title={item.entidadeId ?? undefined}>
                        {truncateEntidadeId(item.entidadeId)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(item.id)}
                          className="text-sm font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                        >
                          {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-neutral-50 dark:bg-neutral-900/40">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs font-medium text-neutral-500">Payload antes</p>
                              <pre className="max-h-48 overflow-auto rounded border border-neutral-200 bg-white p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950">
                                {formatPayloadJson(item.payloadAntes)}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-medium text-neutral-500">Payload depois</p>
                              <pre className="max-h-48 overflow-auto rounded border border-neutral-200 bg-white p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950">
                                {formatPayloadJson(item.payloadDepois)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
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
