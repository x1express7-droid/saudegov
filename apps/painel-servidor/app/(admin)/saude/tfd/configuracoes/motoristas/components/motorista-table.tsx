'use client'

import { DeactivateDialog } from '../../../../../configuracoes/organograma/components/deactivate-dialog'
import {
  desativarMotoristaTfd,
  type TfdMotoristaListItem,
  type TfdServidorMotoristaOption,
} from '@saude/mod-saude-tfd'
import {
  Badge,
  Button,
  DataTable,
  Select,
  type ColumnDef,
} from '@saude/ui'
import { Pencil, Plus, Power } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { MotoristaForm } from './motorista-form'

const BASE_PATH = '/saude/tfd/configuracoes/motoristas'

interface MotoristaTableProps {
  items: TfdMotoristaListItem[]
  pagination: { page: number; perPage: number; total: number }
  ativoFilter?: boolean
  servidorOptions: TfdServidorMotoristaOption[]
}

type DialogState =
  | { kind: 'form'; mode: 'create' | 'edit'; motorista?: TfdMotoristaListItem }
  | { kind: 'deactivate'; motorista: TfdMotoristaListItem }
  | null

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function statusBadge(ativo: boolean) {
  return <Badge variant={ativo ? 'green' : 'gray'}>{ativo ? 'Ativo' : 'Inativo'}</Badge>
}

function cnhValidadeBadge(item: TfdMotoristaListItem) {
  if (item.cnhVencida) {
    return (
      <Badge variant="red" className="ml-[var(--space-2)]">
        Vencida
      </Badge>
    )
  }
  if (item.cnhVencendoEmBreve) {
    return (
      <Badge variant="yellow" className="ml-[var(--space-2)]">
        Vence em breve
      </Badge>
    )
  }
  return null
}

export function MotoristaTable({
  items,
  pagination,
  ativoFilter,
  servidorOptions,
}: MotoristaTableProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>(null)

  const ativoSelectValue =
    ativoFilter === true ? '1' : ativoFilter === false ? '0' : 'all'

  const editServidorOptions = useMemo(() => {
    if (dialog?.kind !== 'form' || dialog.mode !== 'edit' || !dialog.motorista) {
      return servidorOptions
    }
    return [
      {
        value: dialog.motorista.userId,
        label: dialog.motorista.userNome,
        email: dialog.motorista.userEmail,
      },
      ...servidorOptions,
    ]
  }, [dialog, servidorOptions])

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

  const columns = useMemo<ColumnDef<TfdMotoristaListItem>[]>(
    () => [
      {
        id: 'servidor',
        header: 'Servidor',
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-[var(--color-text)]">{row.original.userNome}</span>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              {row.original.userEmail}
            </p>
          </div>
        ),
      },
      {
        id: 'cnh',
        header: 'CNH',
        cell: ({ row }) => (
          <span className="font-mono text-[length:var(--text-sm)] text-[var(--color-text)]">
            {row.original.cnh}
          </span>
        ),
      },
      {
        id: 'categoria',
        header: 'Categoria',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">{row.original.cnhCategoria}</span>
        ),
      },
      {
        id: 'validade',
        header: 'Validade',
        cell: ({ row }) => (
          <span className="inline-flex flex-wrap items-center text-[var(--color-text)]">
            {formatDate(row.original.cnhValidade)}
            {cnhValidadeBadge(row.original)}
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
                onClick={() => setDialog({ kind: 'form', mode: 'edit', motorista: item })}
                aria-label={`Editar motorista ${item.userNome}`}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              {item.ativo ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-0 min-w-0 px-[var(--space-2)] py-[var(--space-1)]"
                  onClick={() => setDialog({ kind: 'deactivate', motorista: item })}
                  aria-label={`Desativar motorista ${item.userNome}`}
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
          Novo motorista
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
        emptyMessage="Nenhum motorista cadastrado."
      />

      {dialog?.kind === 'form' ? (
        <MotoristaForm
          open
          mode={dialog.mode}
          motorista={dialog.motorista}
          servidorOptions={editServidorOptions}
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
          titulo="Desativar motorista"
          descricao={`Confirma a desativação de ${dialog.motorista.userNome} como motorista? Ele deixará de aparecer na seleção de agendamentos.`}
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null)
            }
          }}
          onConfirm={async () => {
            const response = await desativarMotoristaTfd({ id: dialog.motorista.id })
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
