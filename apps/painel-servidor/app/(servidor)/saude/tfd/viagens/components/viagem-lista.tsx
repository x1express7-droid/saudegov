'use client'

import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import { Button, DataTable, EmptyState, type ColumnDef } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { ViagemStatusBadge } from '../../components/viagem-status-badge'

const VIAGENS_BASE = '/saude/tfd/viagens'
const DEFAULT_PER_PAGE = 20

function formatDataSaida(data: string, hora: string | null): string {
  const parsed = data.length === 10 ? `${data}T12:00:00` : data
  const label = new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return hora ? `${label} ${hora}` : label
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

export interface ViagemListaProps {
  items: ViagemTfdListItem[]
  total: number
  session: SaudeMunicSession
}

export function ViagemLista({ items, total, session }: ViagemListaProps) {
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
    (row: ViagemTfdListItem) => {
      router.push(`${VIAGENS_BASE}/${row.id}`)
    },
    [router]
  )

  const columns = useMemo<ColumnDef<ViagemTfdListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <Link
            href={`${VIAGENS_BASE}/${row.original.id}`}
            className="font-medium text-[var(--color-primary)] hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.protocolo}
          </Link>
        ),
      },
      {
        id: 'dataSaida',
        header: 'Data saída',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text)]">
            {formatDataSaida(row.original.dataSaida, row.original.horaSaida)}
          </span>
        ),
      },
      {
        id: 'rota',
        header: 'Origem → Destino',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">
            {row.original.origemDescricao} → {row.original.destinoDescricao}
          </span>
        ),
      },
      {
        id: 'veiculo',
        header: 'Veículo',
        cell: ({ row }) =>
          row.original.veiculo ? (
            <span>
              {row.original.veiculo.placa} — {row.original.veiculo.modelo}
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">—</span>
          ),
      },
      {
        id: 'motorista',
        header: 'Motorista',
        cell: ({ row }) =>
          row.original.motorista ? (
            <span>{row.original.motorista.nome}</span>
          ) : (
            <span className="text-[var(--color-text-muted)]">—</span>
          ),
      },
      {
        id: 'passageiros',
        header: 'Passageiros',
        cell: ({ row }) => {
          const ocupados = row.original.totalPassageiros
          const capacidade = row.original.capacidadeVeiculo
          if (capacidade === null) {
            return <span className="text-[var(--color-text-muted)]">{ocupados}</span>
          }
          return (
            <span>
              {ocupados}/{capacidade} vagas
            </span>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <ViagemStatusBadge status={row.original.status} size="sm" />,
      },
    ],
    []
  )

  if (total === 0) {
    return (
      <EmptyState
        titulo="Nenhuma viagem cadastrada"
        descricao="Crie uma nova viagem para organizar os deslocamentos dos agendamentos TFD."
        cta={
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
            <Button variant="primary" asChild>
              <Link href={`${VIAGENS_BASE}/nova`}>Nova viagem</Link>
            </Button>
          </PermissionGate>
        }
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
      emptyMessage="Nenhuma viagem encontrada"
      emptyDescription="Ajuste os filtros ou crie uma nova viagem para iniciar o deslocamento."
      emptyCta={
        <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
          <Button variant="primary" asChild>
            <Link href={`${VIAGENS_BASE}/nova`}>Nova viagem</Link>
          </Button>
        </PermissionGate>
      }
    />
  )
}
