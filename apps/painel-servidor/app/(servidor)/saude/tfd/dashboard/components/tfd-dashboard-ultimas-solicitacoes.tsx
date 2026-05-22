'use client'

import type { TfdSolicitacaoListItem } from '@saude/mod-saude-tfd/client'
import {
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
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

const TFD_DETAIL_BASE = '/saude/tfd'

function formatDataAbertura(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isTfdStatus(value: string): value is TfdStatus {
  return value in TFD_STATUS_CONFIG
}

function isTfdUrgencia(value: string): value is TfdUrgencia {
  return value in TFD_URGENCIA_CONFIG
}

export interface TfdDashboardUltimasSolicitacoesProps {
  items: TfdSolicitacaoListItem[]
}

export function TfdDashboardUltimasSolicitacoes({ items }: TfdDashboardUltimasSolicitacoesProps) {
  const router = useRouter()
  const total = items.length
  const perPage = Math.max(1, total)

  const columns = useMemo<ColumnDef<TfdSolicitacaoListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => <ProtocoloBadge protocolo={row.original.protocolo} />,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          isTfdStatus(row.original.status) ? (
            <StatusBadge status={row.original.status} size="sm" />
          ) : (
            row.original.status
          ),
      },
      {
        id: 'urgencia',
        header: 'Urgência',
        cell: ({ row }) =>
          isTfdUrgencia(row.original.urgencia) ? (
            <UrgenciaBadge urgencia={row.original.urgencia} size="sm" />
          ) : (
            row.original.urgencia
          ),
      },
      {
        id: 'data',
        header: 'Abertura',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {formatDataAbertura(row.original.criadoEm)}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={items}
      pagination={{ page: 1, perPage, total }}
      onPaginationChange={() => {}}
      emptyMessage="Nenhuma solicitação encontrada."
      onRowClick={(row) => router.push(`${TFD_DETAIL_BASE}/${row.id}`)}
    />
  )
}
