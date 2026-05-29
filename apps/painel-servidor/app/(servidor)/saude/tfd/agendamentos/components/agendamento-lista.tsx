'use client'

import { exportarAgendamentosTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import { TfdAgendamentoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  DataTable,
  EmptyState,
  Badge,
  ProtocoloBadge,
  type ColumnDef,
} from '@saude/ui'
import { AlertCircle, Calendar, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { TfdExportCsvButton } from '../../components/tfd-export-csv-button'

const TFD_DETAIL_BASE = '/saude/tfd'
const DEFAULT_PER_PAGE = 20

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const VIAGEM_STATUS_LABEL: Record<string, string> = {
  AGENDADA: 'Agendada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
}

function labelViagemStatus(status: string): string {
  return VIAGEM_STATUS_LABEL[status] ?? status
}

function formatDataViagem(iso: string): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  return new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDataHora(dataViagem: string, horaSaida: string | null): string {
  const data = formatDataViagem(dataViagem)
  return horaSaida ? `${data} às ${horaSaida}` : data
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

function Lembrete48hIcon({ item }: { item: TfdAgendamentoListItem }) {
  if (item.lembrete48hEnviadoAt) {
    return (
      <span
        className="inline-flex text-[var(--color-success)]"
        title="Lembrete 48h enviado"
        aria-label="Lembrete 48h enviado"
      >
        <CheckCircle2 className="size-5" aria-hidden="true" />
      </span>
    )
  }

  if (item.lembrete48hFalhouAt) {
    return (
      <span
        className="inline-flex text-[var(--color-danger)]"
        title="Falha no envio do lembrete 48h"
        aria-label="Falha no envio do lembrete 48h"
      >
        <AlertCircle className="size-5" aria-hidden="true" />
      </span>
    )
  }

  return (
    <span
      className="inline-flex text-[var(--color-text-muted)]"
      title="Lembrete 48h pendente"
      aria-label="Lembrete 48h pendente"
    >
      <Clock className="size-5" aria-hidden="true" />
    </span>
  )
}

export interface AgendamentoListaProps {
  items: TfdAgendamentoListItem[]
  total: number
  session: SaudeMunicSession
}

function buildExportFiltros(searchParams: URLSearchParams) {
  const dataInicio = searchParams.get('dataInicio')?.trim()
  const dataFim = searchParams.get('dataFim')?.trim()
  const motoristaId = searchParams.get('motoristaId')?.trim()
  const veiculoId = searchParams.get('veiculoId')?.trim()

  return {
    ...(dataInicio && DATE_REGEX.test(dataInicio) ? { dataInicio } : {}),
    ...(dataFim && DATE_REGEX.test(dataFim) ? { dataFim } : {}),
    ...(motoristaId && UUID_REGEX.test(motoristaId) ? { motoristaId } : {}),
    ...(veiculoId && UUID_REGEX.test(veiculoId) ? { veiculoId } : {}),
  }
}

export function AgendamentoLista({ items, total, session }: AgendamentoListaProps) {
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
    (row: TfdAgendamentoListItem) => {
      router.push(`${TFD_DETAIL_BASE}/${row.solicitacao.id}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<TfdAgendamentoListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <div
            className="flex flex-wrap items-center gap-[var(--space-2)]"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Link href={`${TFD_DETAIL_BASE}/${row.original.solicitacao.id}`}>
              <ProtocoloBadge protocolo={row.original.protocolo} />
            </Link>
            <Badge variant="slate" size="sm">
              Histórico
            </Badge>
          </div>
        ),
      },
      {
        id: 'paciente',
        header: 'Paciente',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">
            {row.original.solicitacao.paciente.nome}
          </span>
        ),
      },
      {
        id: 'dataViagem',
        header: 'Data / hora',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text)]">
            {formatDataHora(row.original.dataViagem, row.original.horaSaida)}
          </span>
        ),
      },
      {
        id: 'sequencia',
        header: 'Sequência',
        cell: ({ row }) => (
          <span className="tabular-nums text-[var(--color-text)]">{row.original.sequencia}</span>
        ),
      },
      {
        id: 'motorista',
        header: 'Motorista',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {row.original.motorista?.nome ?? '—'}
          </span>
        ),
      },
      {
        id: 'veiculo',
        header: 'Veículo',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {row.original.veiculo?.placa ?? '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {labelViagemStatus(row.original.status)}
          </span>
        ),
      },
      {
        id: 'lembrete48h',
        header: 'Lembrete 48h',
        cell: ({ row }) => <Lembrete48hIcon item={row.original} />,
      },
    ],
    []
  )

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-[var(--space-4)]">
        <div className="flex justify-end">
          <TfdExportCsvButton
            session={session}
            onExport={() => exportarAgendamentosTfdCsv(buildExportFiltros(searchParams))}
          />
        </div>
        <EmptyState
          icon={<Calendar className="size-6" aria-hidden="true" />}
          titulo="Nenhum agendamento encontrado."
          descricao="Ajuste o período dos filtros ou limpe-os para ver mais viagens."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex justify-end">
        <TfdExportCsvButton
          session={session}
          onExport={() => exportarAgendamentosTfdCsv(buildExportFiltros(searchParams))}
        />
      </div>
      <DataTable
        data={items}
        columns={columns}
        pagination={{ page, perPage, total }}
        onPaginationChange={handlePaginationChange}
        onRowClick={handleRowClick}
        emptyMessage="Nenhum agendamento encontrado."
      />
    </div>
  )
}
