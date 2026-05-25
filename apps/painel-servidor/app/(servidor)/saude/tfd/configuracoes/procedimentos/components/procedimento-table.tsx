'use client'

import { type TfdProcedimentoListItem } from '@saude/mod-saude-tfd/client'
import { desativarProcedimentoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { DeactivateDialog } from '@/app/(admin)/configuracoes/organograma/components/deactivate-dialog'

import {
  Badge,
  Button,
  DataTable,
  Select,
  type ColumnDef,
  type SelectOption,
} from '@saude/ui'
import { Pencil, Plus, Power } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ProcedimentoForm } from './procedimento-form'

const BASE_PATH = '/saude/tfd/configuracoes/procedimentos'

interface ProcedimentoTableProps {
  items: TfdProcedimentoListItem[]
  pagination: { page: number; perPage: number; total: number }
  ativoFilter?: boolean
  especialidadeFilterId?: string
  especialidadeOptions: SelectOption[]
}

type DialogState =
  | { kind: 'form'; mode: 'create' | 'edit'; procedimento?: TfdProcedimentoListItem }
  | { kind: 'deactivate'; procedimento: TfdProcedimentoListItem }
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

export function ProcedimentoTable({
  items,
  pagination,
  ativoFilter,
  especialidadeFilterId,
  especialidadeOptions,
}: ProcedimentoTableProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>(null)

  const ativoSelectValue =
    ativoFilter === true ? '1' : ativoFilter === false ? '0' : 'all'

  const especialidadeSelectValue = especialidadeFilterId ?? 'all'

  function navigate(params: Record<string, string | undefined>) {
    const search = new URLSearchParams()
    if (params.page && params.page !== '1') {
      search.set('page', params.page)
    }
    if (params.ativo === '1' || params.ativo === '0') {
      search.set('ativo', params.ativo)
    }
    if (params.especialidadeId) {
      search.set('especialidadeId', params.especialidadeId)
    }
    const query = search.toString()
    router.push(query ? `${BASE_PATH}?${query}` : BASE_PATH)
  }

  const columns = useMemo<ColumnDef<TfdProcedimentoListItem>[]>(
    () => [
      {
        id: 'nome',
        header: 'Procedimento',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">{row.original.nome}</span>
        ),
      },
      {
        id: 'especialidade',
        header: 'Especialidade',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">{row.original.especialidadeNome}</span>
        ),
      },
      {
        id: 'codigoSigtap',
        header: 'Código SIGTAP',
        cell: ({ row }) => (
          <span className="font-mono text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {row.original.codigoSigtap ?? '—'}
          </span>
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
                onClick={() => setDialog({ kind: 'form', mode: 'edit', procedimento: item })}
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
                  onClick={() => setDialog({ kind: 'deactivate', procedimento: item })}
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

  const filtroEspecialidadeOptions: SelectOption[] = [
    { value: 'all', label: 'Todas as especialidades' },
    ...especialidadeOptions,
  ]

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-4)] lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:flex-wrap sm:items-end">
          <Select
            label="Especialidade"
            value={especialidadeSelectValue}
            onValueChange={(value) => {
              navigate({
                page: '1',
                ativo: ativoSelectValue === 'all' ? undefined : ativoSelectValue,
                especialidadeId: value === 'all' ? undefined : value,
              })
            }}
            options={filtroEspecialidadeOptions}
            className="w-full sm:max-w-xs"
          />
          <Select
            label="Status"
            value={ativoSelectValue}
            onValueChange={(value) => {
              navigate({
                page: '1',
                ativo: value === 'all' ? undefined : value,
                especialidadeId:
                  especialidadeSelectValue === 'all' ? undefined : especialidadeSelectValue,
              })
            }}
            options={[
              { value: 'all', label: 'Todos' },
              { value: '1', label: 'Somente ativos' },
              { value: '0', label: 'Somente inativos' },
            ]}
            className="w-full sm:max-w-xs"
          />
        </div>

        <Button
          type="button"
          onClick={() => setDialog({ kind: 'form', mode: 'create' })}
          disabled={especialidadeOptions.length === 0}
          className="shrink-0"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo procedimento
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
            especialidadeId:
              especialidadeSelectValue === 'all' ? undefined : especialidadeSelectValue,
          })
        }}
        emptyMessage="Nenhum procedimento cadastrado."
      />

      {dialog?.kind === 'form' ? (
        <ProcedimentoForm
          open
          mode={dialog.mode}
          procedimento={dialog.procedimento}
          especialidadeOptions={especialidadeOptions}
          defaultEspecialidadeId={especialidadeFilterId}
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
          titulo="Desativar procedimento"
          descricao={`Confirma a desativação de "${dialog.procedimento.nome}"? O registro permanece no histórico, mas não poderá ser selecionado em novas solicitações.`}
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null)
            }
          }}
          onConfirm={async () => {
            const response = await desativarProcedimentoTfd({ id: dialog.procedimento.id })
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
