'use client'

import { type TfdPrestadorListItem } from '@saude/mod-saude-tfd/client'
import { desativarPrestadorTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { DeactivateDialog } from '../../../../../configuracoes/organograma/components/deactivate-dialog'

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
import type { EspecialidadeCheckboxOption } from './especialidades-checkbox-group'
import { PrestadorForm } from './prestador-form'

const BASE_PATH = '/saude/tfd/configuracoes/prestadores'

interface PrestadorTableProps {
  items: TfdPrestadorListItem[]
  pagination: { page: number; perPage: number; total: number }
  ativoFilter?: boolean
  especialidadeOptions: EspecialidadeCheckboxOption[]
}

type DialogState =
  | { kind: 'form'; mode: 'create' | 'edit'; prestador?: TfdPrestadorListItem }
  | { kind: 'deactivate'; prestador: TfdPrestadorListItem }
  | null

function formatCnpj(value: string | null): string {
  if (!value) {
    return '—'
  }
  if (value.length !== 14) {
    return value
  }
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`
}

function statusBadge(ativo: boolean) {
  return <Badge variant={ativo ? 'green' : 'gray'}>{ativo ? 'Ativo' : 'Inativo'}</Badge>
}

export function PrestadorTable({
  items,
  pagination,
  ativoFilter,
  especialidadeOptions,
}: PrestadorTableProps) {
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

  const columns = useMemo<ColumnDef<TfdPrestadorListItem>[]>(
    () => [
      {
        id: 'nome',
        header: 'Nome',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">{row.original.nome}</span>
        ),
      },
      {
        id: 'local',
        header: 'Cidade / UF',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {row.original.cidade} / {row.original.estado}
          </span>
        ),
      },
      {
        id: 'cnpj',
        header: 'CNPJ',
        cell: ({ row }) => (
          <span className="font-mono text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {formatCnpj(row.original.cnpj)}
          </span>
        ),
      },
      {
        id: 'especialidades',
        header: 'Especialidades',
        cell: ({ row }) => (
          <div className="flex max-w-md flex-wrap gap-[var(--space-1)]">
            {row.original.especialidadeNomes.length === 0 ? (
              <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                —
              </span>
            ) : (
              row.original.especialidadeNomes.map((nome, index) => (
                <Badge key={`${row.original.id}-${index}`} variant="blue">
                  {nome}
                </Badge>
              ))
            )}
          </div>
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
                onClick={() => setDialog({ kind: 'form', mode: 'edit', prestador: item })}
                aria-label={`Editar ${item.nome}`}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              {item.ativo ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-0 min-w-0 px-[var(--space-2)] py-[var(--space-1)]"
                  onClick={() => setDialog({ kind: 'deactivate', prestador: item })}
                  aria-label={`Desativar ${item.nome}`}
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
          Novo prestador
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
        emptyMessage="Nenhum prestador cadastrado."
      />

      {dialog?.kind === 'form' ? (
        <PrestadorForm
          open
          mode={dialog.mode}
          prestador={dialog.prestador}
          especialidadeOptions={especialidadeOptions}
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
          titulo="Desativar prestador"
          descricao={`Confirma a desativação de "${dialog.prestador.nome}"? O cadastro permanece no histórico, mas não poderá ser selecionado em novas solicitações.`}
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null)
            }
          }}
          onConfirm={async () => {
            const response = await desativarPrestadorTfd({ id: dialog.prestador.id })
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
