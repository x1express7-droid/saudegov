'use client'

import type { TfdPrestacaoListItem } from '@saude/mod-saude-tfd'
import {
  Badge,
  DataTable,
  EmptyState,
  ProtocoloBadge,
  type ColumnDef,
} from '@saude/ui'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

const TFD_DETAIL_BASE = '/saude/tfd'
const DEFAULT_PER_PAGE = 20

const PRESTACAO_STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  ENVIADA: 'Enviada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
}

const PRESTACAO_STATUS_VARIANT: Record<
  string,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  PENDENTE: 'orange',
  ENVIADA: 'purple',
  APROVADA: 'green',
  REJEITADA: 'red',
}

function labelPrestacaoStatus(status: string): string {
  return PRESTACAO_STATUS_LABEL[status] ?? status
}

function formatData(iso: string): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  return new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatValorBrl(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
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

export interface PrestacaoListaProps {
  items: TfdPrestacaoListItem[]
  total: number
}

export function PrestacaoLista({ items, total }: PrestacaoListaProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const perPage = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get('perPage') ?? String(DEFAULT_PER_PAGE), 10) ||
      DEFAULT_PER_PAGE)
  )

  const irParaPagina = useCallback(
    (novaPagina: number) => {
      const query = buildQueryString(searchParams, { page: String(novaPagina) })
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const handlePaginationChange = useCallback(
    (novaPagina: number) => {
      irParaPagina(novaPagina)
    },
    [irParaPagina]
  )

  const columns = useMemo<ColumnDef<TfdPrestacaoListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <Link
            href={`${TFD_DETAIL_BASE}/${row.original.solicitacaoId}`}
            className="inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <ProtocoloBadge protocolo={row.original.protocolo} />
          </Link>
        ),
      },
      {
        id: 'status',
        header: 'Status PC',
        cell: ({ row }) => (
          <Badge variant={PRESTACAO_STATUS_VARIANT[row.original.status] ?? 'gray'}>
            {labelPrestacaoStatus(row.original.status)}
          </Badge>
        ),
      },
      {
        id: 'viagem',
        header: 'Viagem',
        cell: ({ row }) => <span>{row.original.sequenciaViagem}</span>,
      },
      {
        id: 'paciente',
        header: 'Paciente',
        cell: ({ row }) => <span>{row.original.paciente.nome}</span>,
      },
      {
        id: 'especialidade',
        header: 'Especialidade',
        cell: ({ row }) => <span>{row.original.especialidade}</span>,
      },
      {
        id: 'prazo',
        header: 'Prazo envio',
        cell: ({ row }) => <span>{formatData(row.original.prazoEnvioAt)}</span>,
      },
      {
        id: 'itens',
        header: 'Itens',
        cell: ({ row }) => <span>{row.original.quantidadeItens}</span>,
      },
      {
        id: 'valor',
        header: 'Valor total',
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatValorBrl(row.original.valorTotal)}
          </span>
        ),
      },
    ],
    []
  )

  if (items.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma prestação de contas encontrada"
        descricao="Ajuste os filtros ou registre o retorno de viagens para iniciar prestações."
      />
    )
  }

  return (
    <DataTable
      data={items}
      columns={columns}
      pagination={{ page, perPage, total }}
      onPaginationChange={handlePaginationChange}
      emptyMessage="Nenhuma prestação de contas encontrada."
    />
  )
}
