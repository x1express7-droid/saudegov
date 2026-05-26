'use client'

import { exportarSolicitacoesTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import { TfdSolicitacaoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Button,
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
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { TfdExportCsvButton } from './tfd-export-csv-button'

const TFD_DETAIL_BASE = '/saude/tfd'
const DEFAULT_PER_PAGE = 20

const STATUS_VALUES = new Set<string>([
  'RASCUNHO',
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
  'NEGADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
  'CANCELADO',
])

const URGENCIA_VALUES = new Set<string>(['BAIXA', 'INTERMEDIARIA', 'GRAVE', 'MUITO_URGENTE'])

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

function formatDataAbertura(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelTipoAtendimento(tipo: string): string {
  return TIPO_ATENDIMENTO_LABEL[tipo] ?? tipo
}

function isTfdStatus(value: string): value is TfdStatus {
  return value in TFD_STATUS_CONFIG
}

function isTfdUrgencia(value: string): value is TfdUrgencia {
  return value in TFD_URGENCIA_CONFIG
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

export interface SolicitacaoListaProps {
  items: TfdSolicitacaoListItem[]
  total: number
  session: SaudeMunicSession
}

function buildExportFiltros(searchParams: URLSearchParams) {
  const status = searchParams.get('status')?.trim()
  const urgencia = searchParams.get('urgencia')?.trim()
  const protocolo = searchParams.get('protocolo')?.trim()

  return {
    ...(status && STATUS_VALUES.has(status) ? { status } : {}),
    ...(urgencia && URGENCIA_VALUES.has(urgencia) ? { urgencia } : {}),
    ...(protocolo ? { protocolo } : {}),
  }
}

export function SolicitacaoLista({ items, total, session }: SolicitacaoListaProps) {
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
    (row: TfdSolicitacaoListItem) => {
      router.push(`${TFD_DETAIL_BASE}/${row.id}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<TfdSolicitacaoListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <ProtocoloBadge protocolo={row.original.protocolo} />
          </div>
        ),
      },
      {
        id: 'paciente',
        header: 'Paciente',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">
            {row.original.paciente.nome}
          </span>
        ),
      },
      {
        id: 'especialidade',
        header: 'Especialidade',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">{row.original.especialidade}</span>
        ),
      },
      {
        id: 'urgencia',
        header: 'Urgência',
        cell: ({ row }) =>
          isTfdUrgencia(row.original.urgencia) ? (
            <UrgenciaBadge urgencia={row.original.urgencia} />
          ) : (
            <span className="text-[var(--color-text-muted)]">{row.original.urgencia}</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          isTfdStatus(row.original.status) ? (
            <StatusBadge status={row.original.status} />
          ) : (
            <span className="text-[var(--color-text-muted)]">{row.original.status}</span>
          ),
      },
      {
        id: 'tipoAtendimento',
        header: 'Tipo de atendimento',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {labelTipoAtendimento(row.original.tipoAtendimento)}
          </span>
        ),
      },
      {
        id: 'criadoEm',
        header: 'Data de abertura',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {formatDataAbertura(row.original.criadoEm)}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex justify-end">
        <TfdExportCsvButton
          session={session}
          onExport={() => exportarSolicitacoesTfdCsv(buildExportFiltros(searchParams))}
        />
      </div>
      <DataTable
        data={items}
        columns={columns}
        pagination={{ page, perPage, total }}
        onPaginationChange={handlePaginationChange}
        onRowClick={handleRowClick}
        emptyMessage="Nenhuma solicitação encontrada"
        emptyDescription="Ajuste os filtros ou abra uma nova solicitação para iniciar o fluxo TFD."
        emptyCta={
          <Button variant="primary" asChild>
            <Link href="/saude/tfd/nova">Nova solicitação</Link>
          </Button>
        }
      />
    </div>
  )
}
