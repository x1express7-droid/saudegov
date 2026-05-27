'use client'

import type { TfdAgendamentoConsultaListItem } from '@saude/mod-saude-tfd/client'
import {
  DataTable,
  EmptyState,
  ProtocoloBadge,
  type ColumnDef,
} from '@saude/ui'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { AgendamentoStatusBadge } from '../../components/agendamento-status-badge'

const DEFAULT_PER_PAGE = 20

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

function formatDataConsulta(iso: string, hora: string | null): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  const data = new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return hora ? `${data} às ${hora}` : data
}

function labelPrestador(item: TfdAgendamentoConsultaListItem): string {
  const { prestador } = item
  if (!prestador.nome) {
    return '—'
  }
  if (prestador.cidade && prestador.estado) {
    return `${prestador.nome} (${prestador.cidade}/${prestador.estado})`
  }
  return prestador.nome
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

export interface AgendamentoConsultaListaProps {
  items: TfdAgendamentoConsultaListItem[]
  total: number
}

export function AgendamentoConsultaLista({ items, total }: AgendamentoConsultaListaProps) {
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
        fonte: 'consultas',
      })
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router, searchParams]
  )

  const handleRowClick = useCallback(
    (row: TfdAgendamentoConsultaListItem) => {
      router.push(`/saude/tfd/processos/${row.processoId}/agendamentos/${row.id}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<TfdAgendamentoConsultaListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <Link href={`/saude/tfd/${row.original.solicitacaoId}`}>
              <ProtocoloBadge protocolo={row.original.protocolo} />
            </Link>
          </div>
        ),
      },
      {
        id: 'paciente',
        header: 'Paciente',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">{row.original.pacienteNome}</span>
        ),
      },
      {
        id: 'data',
        header: 'Data / hora',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text)]">
            {formatDataConsulta(row.original.dataConsulta, row.original.horaConsulta)}
          </span>
        ),
      },
      {
        id: 'sequencia',
        header: 'Seq.',
        cell: ({ row }) => (
          <span className="tabular-nums text-[var(--color-text)]">{row.original.sequencia}</span>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {TIPO_ATENDIMENTO_LABEL[row.original.tipoAtendimento] ?? row.original.tipoAtendimento}
          </span>
        ),
      },
      {
        id: 'prestador',
        header: 'Prestador',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">{labelPrestador(row.original)}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <AgendamentoStatusBadge status={row.original.status} size="sm" />,
      },
    ],
    []
  )

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="size-6" aria-hidden="true" />}
        titulo="Nenhum agendamento de consulta encontrado."
        descricao="Ajuste o período dos filtros ou limpe-os para ver mais registros."
      />
    )
  }

  return (
    <DataTable
      data={items}
      columns={columns}
      pagination={{ page, perPage, total }}
      onPaginationChange={handlePaginationChange}
      onRowClick={handleRowClick}
      emptyMessage="Nenhum agendamento de consulta encontrado."
    />
  )
}
