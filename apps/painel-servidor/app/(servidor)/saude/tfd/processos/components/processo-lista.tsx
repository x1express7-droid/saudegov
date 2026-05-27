'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import {
  Badge,
  Button,
  DataTable,
  ProtocoloBadge,
  UrgenciaBadge,
  type ColumnDef,
  type TfdUrgencia,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { ProcessoStatusBadge } from '../../components/processo-status-badge'

const PROCESSOS_BASE = '/saude/tfd/processos'
const DEFAULT_PER_PAGE = 20

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.round((then - now) / 1000)
  const absSec = Math.abs(diffSec)

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

  for (const [unit, secondsInUnit] of units) {
    if (absSec >= secondsInUnit || unit === 'second') {
      const value = Math.round(diffSec / secondsInUnit)
      return rtf.format(value, unit)
    }
  }

  return rtf.format(0, 'second')
}

function isTfdUrgencia(value: string | null): value is TfdUrgencia {
  if (!value) {
    return false
  }
  return value in { BAIXA: true, INTERMEDIARIA: true, GRAVE: true, MUITO_URGENTE: true }
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

export interface ProcessoListaProps {
  items: ProcessoTfdListItem[]
  total: number
  session: SaudeMunicSession
}

export function ProcessoLista({ items, total, session }: ProcessoListaProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const perPage = Math.max(
    1,
    Number.parseInt(searchParams.get('perPage') ?? String(DEFAULT_PER_PAGE), 10) ||
      DEFAULT_PER_PAGE
  )

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
    (row: ProcessoTfdListItem) => {
      router.push(`${PROCESSOS_BASE}/${row.processoId}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<ProcessoTfdListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <ProtocoloBadge protocolo={row.original.protocolo} />
          </div>
        ),
      },
      {
        id: 'paciente',
        header: 'Paciente',
        cell: ({ row }) =>
          row.original.paciente ? (
            <Link
              href={`${PROCESSOS_BASE}/${row.original.processoId}`}
              className="font-medium text-[var(--color-primary)] hover:underline"
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
        cell: ({ row }) => <ProcessoStatusBadge status={row.original.statusProcesso} />,
      },
      {
        id: 'urgencia',
        header: 'Urgência',
        cell: ({ row }) =>
          isTfdUrgencia(row.original.urgenciaMaisCritica) ? (
            <UrgenciaBadge urgencia={row.original.urgenciaMaisCritica} />
          ) : (
            <span className="text-[var(--color-text-muted)]">—</span>
          ),
      },
      {
        id: 'solicitacoes',
        header: 'Solicitações',
        cell: ({ row }) => (
          <Badge variant="blue" size="sm">
            {row.original.totalSolicitacoes}
          </Badge>
        ),
      },
      {
        id: 'movimentacao',
        header: 'Última movimentação',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {formatRelativeTime(row.original.ultimaMovimentacaoEm)}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <DataTable
      data={items}
      columns={columns}
      pagination={{ page, perPage, total }}
      onPaginationChange={handlePaginationChange}
      onRowClick={handleRowClick}
      emptyMessage="Nenhum processo encontrado"
      emptyDescription="Ajuste os filtros ou abra um novo processo para iniciar o fluxo TFD."
      emptyCta={
        <PermissionGate session={session} permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}>
          <Button variant="primary" asChild>
            <Link href="/saude/tfd/processos/novo">Novo processo</Link>
          </Button>
        </PermissionGate>
      }
    />
  )
}
