'use client'

import { type TfdVeiculoListItem } from '@saude/mod-saude-tfd/client'
import { desativarVeiculoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { DeactivateDialog } from '@/app/(admin)/configuracoes/organograma/components/deactivate-dialog'

import {
  Badge,
  Button,
  DataTable,
  Select,
  type ColumnDef,
} from '@saude/ui'
import { Pencil, Plus, Power } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { VeiculoForm } from './veiculo-form'

const BASE_PATH = '/saude/tfd/configuracoes/veiculos'

interface VeiculoTableProps {
  items: TfdVeiculoListItem[]
  pagination: { page: number; perPage: number; total: number }
  ativoFilter?: boolean
}

type DialogState =
  | { kind: 'form'; mode: 'create' | 'edit'; veiculo?: TfdVeiculoListItem }
  | { kind: 'deactivate'; veiculo: TfdVeiculoListItem }
  | null

function statusBadge(ativo: boolean) {
  return <Badge variant={ativo ? 'green' : 'gray'}>{ativo ? 'Ativo' : 'Inativo'}</Badge>
}

export function VeiculoTable({ items, pagination, ativoFilter }: VeiculoTableProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>(null)

  const ativoSelectValue =
    ativoFilter === true ? '1' : ativoFilter === false ? '0' : 'all'

  function navigate(params: Record<string, string | undefined>) {
    const search = new URLSearchParams()
    if (params.page && params.page !== '1') {
      search.set('page', params.page)
    }
    if (params.ativo === '1' || params.ativo === '0') {
      search.set('ativo', params.ativo)
    }
    const query = search.toString()
    router.push(query ? `${BASE_PATH}?${query}` : BASE_PATH)
  }

  const columns = useMemo<ColumnDef<TfdVeiculoListItem>[]>(
    () => [
      {
        id: 'placa',
        header: 'Placa',
        cell: ({ row }) => (
          <Link
            href={`${BASE_PATH}/${row.original.id}`}
            className="font-mono font-medium uppercase text-[var(--color-primary)] hover:underline"
          >
            {row.original.placa}
          </Link>
        ),
      },
      {
        id: 'modelo',
        header: 'Modelo',
        cell: ({ row }) => (
          <Link
            href={`${BASE_PATH}/${row.original.id}`}
            className="text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
          >
            {row.original.modelo}
          </Link>
        ),
      },
      {
        id: 'capacidade',
        header: 'Capacidade',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">
            {row.original.capacidadePassageiros}{' '}
            {row.original.capacidadePassageiros === 1 ? 'passageiro' : 'passageiros'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => statusBadge(row.original.ativo),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <Button
                type="button"
                variant="ghost"
                className="min-h-0 min-w-0 px-[var(--space-2)] py-[var(--space-1)]"
                onClick={() => setDialog({ kind: 'form', mode: 'edit', veiculo: item })}
                aria-label={`Editar veículo ${item.placa}`}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              {item.ativo ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-0 min-w-0 px-[var(--space-2)] py-[var(--space-1)]"
                  onClick={() => setDialog({ kind: 'deactivate', veiculo: item })}
                  aria-label={`Desativar veículo ${item.placa}`}
                >
                  <Power className="size-4" aria-hidden="true" />
                  Desativar
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-end sm:justify-between">
        <Select
          label="Status"
          value={ativoSelectValue}
          onValueChange={(value) => {
            navigate({
              page: '1',
              ativo: value === 'all' ? undefined : value,
            })
          }}
          options={[
            { value: 'all', label: 'Todos' },
            { value: '1', label: 'Somente ativos' },
            { value: '0', label: 'Somente inativos' },
          ]}
          className="w-full sm:max-w-xs"
        />

        <Button
          type="button"
          onClick={() => setDialog({ kind: 'form', mode: 'create' })}
          className="shrink-0"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo veículo
        </Button>
      </div>

      <DataTable
        data={items}
        columns={columns}
        pagination={pagination}
        onPaginationChange={(page) => {
          navigate({
            page: String(page),
            ativo: ativoSelectValue === 'all' ? undefined : ativoSelectValue,
          })
        }}
        emptyMessage="Nenhum veículo cadastrado."
      />

      {dialog?.kind === 'form' ? (
        <VeiculoForm
          open
          mode={dialog.mode}
          veiculo={dialog.veiculo}
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null)
            }
          }}
        />
      ) : null}

      {dialog?.kind === 'deactivate' ? (
        <DeactivateDialog
          open
          titulo="Desativar veículo"
          descricao={`Confirma a desativação do veículo ${dialog.veiculo.placa} (${dialog.veiculo.modelo})? Veículos inativos não aparecem na seleção de agendamentos.`}
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null)
            }
          }}
          onConfirm={async () => {
            const response = await desativarVeiculoTfd({ id: dialog.veiculo.id })
            if (!response.success) {
              return { success: false, error: response.error }
            }
            router.refresh()
            return { success: true }
          }}
        />
      ) : null}
    </div>
  )
}
