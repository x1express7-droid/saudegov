'use client'

import { desativarCidTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import type { TfdCidListItem } from '@saude/mod-saude-tfd/client'
import { DeactivateDialog } from '@/app/(admin)/configuracoes/organograma/components/deactivate-dialog'
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

import { CidForm } from './cid-form'

const BASE_PATH = '/saude/tfd/configuracoes/cids'

interface CidTableProps {
  items: TfdCidListItem[]
  pagination: { page: number; perPage: number; total: number }
  ativoFilter?: boolean
}

type DialogState =
  | { kind: 'form'; mode: 'create' | 'edit'; cid?: TfdCidListItem }
  | { kind: 'deactivate'; cid: TfdCidListItem }
  | null

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function statusBadge(ativo: boolean) {
  return <Badge variant={ativo ? 'green' : 'gray'}>{ativo ? 'Ativo' : 'Inativo'}</Badge>
}

export function CidTable({ items, pagination, ativoFilter }: CidTableProps) {
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

  const columns = useMemo<ColumnDef<TfdCidListItem>[]>(
    () => [
      {
        id: 'codigo',
        header: 'Código',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">{row.original.codigo}</span>
        ),
      },
      {
        id: 'descricao',
        header: 'Descrição',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">{row.original.descricao}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => statusBadge(row.original.ativo),
      },
      {
        id: 'createdAt',
        header: 'Cadastro',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">
            {formatDate(row.original.createdAt)}
          </span>
        ),
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
                onClick={() => setDialog({ kind: 'form', mode: 'edit', cid: item })}
                aria-label={`Editar CID ${item.codigo}`}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              {item.ativo ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-0 min-w-0 px-[var(--space-2)] py-[var(--space-1)]"
                  onClick={() => setDialog({ kind: 'deactivate', cid: item })}
                  aria-label={`Desativar CID ${item.codigo}`}
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
          Novo CID
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
        emptyMessage="Nenhum CID cadastrado."
      />

      {dialog?.kind === 'form' ? (
        <CidForm
          open
          mode={dialog.mode}
          cid={dialog.cid}
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
          titulo="Desativar CID"
          descricao={`Confirma a desativação de "${dialog.cid.codigo} — ${dialog.cid.descricao}"? Solicitações novas não poderão selecionar este CID.`}
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null)
            }
          }}
          onConfirm={async () => {
            const response = await desativarCidTfd({ id: dialog.cid.id })
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
