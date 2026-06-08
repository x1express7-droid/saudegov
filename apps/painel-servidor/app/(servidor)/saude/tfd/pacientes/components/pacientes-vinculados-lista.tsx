'use client'

import type { TfdPacienteVinculadoItem } from '@saude/mod-saude-tfd/client'
import { Badge, Button, DataTable, type ColumnDef } from '@saude/ui'
import { format, parseISO } from 'date-fns'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
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
  podeVerPerfilPaciente: boolean
  podeEditarPaciente?: boolean
}

export function PacientesVinculadosLista({
  items,
  total,
  podeVerPerfilPaciente,
  podeEditarPaciente = false,
}: PacientesVinculadosListaProps) {
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
        cell: ({ row }) =>
          podeVerPerfilPaciente ? (
            <Link
              href={`/saude/tfd/pacientes/${row.original.id}`}
              className="font-medium text-[var(--color-primary)] hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.nome}
            </Link>
          ) : (
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
      ...(podeEditarPaciente
        ? [
            {
              id: 'acoes',
              header: 'Ações',
              cell: ({ row }: { row: { original: TfdPacienteVinculadoItem } }) => {
                const item = row.original
                return (
                  <Button
                    asChild
                    variant="ghost"
                    className="min-h-0 min-w-0 px-[var(--space-2)] py-[var(--space-1)]"
                  >
                    <Link
                      href={`/saude/tfd/pacientes/novo?pacienteId=${item.id}`}
                      aria-label={`Editar paciente ${item.nome}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Editar paciente
                    </Link>
                  </Button>
                )
              },
            } satisfies ColumnDef<TfdPacienteVinculadoItem>,
          ]
        : []),
    ],
    [podeEditarPaciente, podeVerPerfilPaciente]
  )

  return (
    <DataTable
      data={items}
      columns={columns}
      pagination={{ page, perPage, total }}
      onPaginationChange={handlePaginationChange}
      emptyMessage="Nenhum paciente vinculado encontrado"
      emptyDescription="Nenhum paciente cadastrado. Use «Cadastrar ou editar» para registrar na base do município."
    />
  )
}
