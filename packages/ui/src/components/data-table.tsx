'use client'

import type { ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { cn } from '../utils/cn'
import { Button } from './button'
import { EmptyState } from './empty-state'
import { Spinner } from './spinner'

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  pagination: { page: number; perPage: number; total: number }
  onPaginationChange: (page: number) => void
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  emptyCta?: ReactNode
  onRowClick?: (row: T) => void
}

type RowWithHighlight<T> = T & {
  urgencia?: string
  highlightWarning?: boolean
}

function getRowClassName<T>(row: RowWithHighlight<T>, clickable: boolean): string {
  return cn(
    'border-b border-[var(--color-border)] transition-colors',
    clickable &&
      'cursor-pointer hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]',
    row.urgencia === 'MUITO_URGENTE' && 'border-l-4 border-l-[var(--color-error)]',
    row.highlightWarning && 'bg-[var(--color-warning-light)]'
  )
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  onPaginationChange,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyDescription,
  emptyCta,
  onRowClick,
}: DataTableProps<T>) {
  const { page, perPage, total } = pagination
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const showPagination = total > perPage
  const isClickable = Boolean(onRowClick)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  if (loading) {
    return (
      <div
        className="flex min-h-[240px] items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]"
        aria-busy="true"
        aria-live="polite"
      >
        <Spinner className="size-8 text-[var(--color-primary)]" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        titulo={emptyMessage}
        descricao={emptyDescription ?? 'Ajuste os filtros ou cadastre um novo registro.'}
        cta={emptyCta}
      />
    )
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="-mx-[var(--space-1)] overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-1)] md:mx-0 md:px-0">
        <table className="w-full min-w-[640px] border-collapse text-left md:min-w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={getRowClassName(row.original as RowWithHighlight<T>, isClickable)}
                onClick={isClickable ? () => onRowClick?.(row.original) : undefined}
                onKeyDown={
                  isClickable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onRowClick?.(row.original)
                        }
                      }
                    : undefined
                }
                tabIndex={isClickable ? 0 : undefined}
                role={isClickable ? 'button' : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text)]"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Exibindo {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} de {total}{' '}
            registros
          </p>
          <div className="flex items-center gap-[var(--space-2)]">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPaginationChange(page - 1)}
            >
              Anterior
            </Button>
            <span className="min-w-[120px] text-center text-[length:var(--text-sm)] text-[var(--color-text)]">
              Página {page} de {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPaginationChange(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export type { ColumnDef }
