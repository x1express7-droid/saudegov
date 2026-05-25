'use client'

import type { TfdAtividadeRecenteItem } from '@saude/mod-saude-tfd/client'
import {
  DataTable,
  StatusBadge,
  TFD_STATUS_CONFIG,
  type ColumnDef,
  type TfdStatus,
} from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

const TFD_DETAIL_BASE = '/saude/tfd'

function formatDataHora(iso: string): string {
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

export interface TfdDashboardOperacionalAtividadeProps {
  items: TfdAtividadeRecenteItem[]
}

export function TfdDashboardOperacionalAtividade({ items }: TfdDashboardOperacionalAtividadeProps) {
  const router = useRouter()
  const total = items.length
  const perPage = Math.max(1, total)

  const columns = useMemo<ColumnDef<TfdAtividadeRecenteItem>[]>(
    () => [
      {
        id: 'data',
        header: 'Data/hora',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {formatDataHora(row.original.criadoEm)}
          </span>
        ),
      },
      {
        id: 'paciente',
        header: 'Paciente',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)]">{row.original.pacienteNomeParcial}</span>
        ),
      },
      {
        id: 'acao',
        header: 'Ação',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)] font-medium">{row.original.tipoAcao}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          isTfdStatus(row.original.statusAtual) ? (
            <StatusBadge status={row.original.statusAtual} size="sm" />
          ) : (
            row.original.statusAtual
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
      emptyMessage="Nenhuma movimentação recente."
      onRowClick={(row) => router.push(`${TFD_DETAIL_BASE}/${row.solicitacaoId}`)}
    />
  )
}
