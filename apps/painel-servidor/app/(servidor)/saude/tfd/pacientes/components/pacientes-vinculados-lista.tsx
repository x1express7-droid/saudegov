'use client'

import type { TfdPacienteVinculadoItem } from '@saude/mod-saude-tfd/client'
import { Badge, DataTable, type ColumnDef } from '@saude/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

const DEFAULT_PER_PAGE = 20

function formatDataVinculo(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
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

export interface PacientesVinculadosListaProps {
  items: TfdPacienteVinculadoItem[]
  total: number
}

export function PacientesVinculadosLista({ items, total }: PacientesVinculadosListaProps) {
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

  const columns = useMemo<ColumnDef<TfdPacienteVinculadoItem>[]>(
    () => [
      {
        id: 'nome',
        header: 'Nome',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">{row.original.nome}</span>
        ),
      },
      {
        id: 'cns',
        header: 'CNS',
        cell: ({ row }) => (
          <span className="font-mono text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {row.original.cnsMascarado ?? '—'}
          </span>
        ),
      },
      {
        id: 'vinculadoEm',
        header: 'Data de vínculo',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {formatDataVinculo(row.original.vinculadoEm)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          row.original.ativo ? (
            <Badge variant="green" size="sm">
              Ativo
            </Badge>
          ) : (
            <Badge variant="gray" size="sm">
              Inativo
            </Badge>
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
      emptyMessage="Nenhum paciente vinculado encontrado"
      emptyDescription="Nenhum paciente cadastrado. Use «Novo cadastro / atendimento TFD» para registrar na base do município."
    />
  )
}
