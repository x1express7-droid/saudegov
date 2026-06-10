'use client'

import { desativarEspecialidadeTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { TfdEspecialidadeListItem } from '@saude/mod-saude-tfd/client'
import { DeactivateDialog } from '@/app/(admin)/configuracoes/organograma/components/deactivate-dialog'

import {
  Badge,
  Button,
  DataTable,
  formatDateTimeBr,
  Select,
  type ColumnDef,
} from '@saude/ui'
import { Pencil, Plus, Power } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { EspecialidadeForm } from './especialidade-form'

const BASE_PATH = '/saude/tfd/configuracoes/especialidades'

interface EspecialidadeTableProps {
  items: TfdEspecialidadeListItem[]
  pagination: { page: number; perPage: number; total: number }
  ativoFilter?: boolean
}

type DialogState =
  | { kind: 'form'; mode: 'create' | 'edit'; especialidade?: TfdEspecialidadeListItem }
  | { kind: 'deactivate'; especialidade: TfdEspecialidadeListItem }
  | null

function formatDate(iso: string): string {
  return formatDateTimeBr(iso)
}

function statusBadge(ativa: boolean) {
  return <Badge variant={ativa ? 'green' : 'gray'}>{ativa ? 'Ativa' : 'Inativa'}</Badge>
}

export function EspecialidadeTable({
  items,
  pagination,
  ativoFilter,
}: EspecialidadeTableProps) {
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

  const columns = useMemo<ColumnDef<TfdEspecialidadeListItem>[]>(
    () => [
      {
        id: 'nome',
        header: 'Nome',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">{row.original.nome}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => statusBadge(row.original.ativa),
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
                onClick={() => setDialog({ kind: 'form', mode: 'edit', especialidade: item })}
                aria-label={`Editar ${item.nome}`}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              {item.ativa ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-0 min-w-0 px-[var(--space-2)] py-[var(--space-1)]"
                  onClick={() => setDialog({ kind: 'deactivate', especialidade: item })}
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
            { value: 'all', label: 'Todas' },
            { value: '1', label: 'Somente ativas' },
            { value: '0', label: 'Somente inativas' },
          ]}
          className="w-full sm:max-w-xs"
        />

        <Button
          type="button"
          onClick={() => setDialog({ kind: 'form', mode: 'create' })}
          className="shrink-0"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova especialidade
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
        emptyMessage="Nenhuma especialidade cadastrada."
      />

      {dialog?.kind === 'form' ? (
        <EspecialidadeForm
          open
          mode={dialog.mode}
          especialidade={dialog.especialidade}
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
          titulo="Desativar especialidade"
          descricao={`Confirma a desativação de "${dialog.especialidade.nome}"? Procedimentos vinculados permanecem no cadastro, mas novas solicitações não devem usar esta especialidade.`}
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null)
            }
          }}
          onConfirm={async () => {
            const response = await desativarEspecialidadeTfd({ id: dialog.especialidade.id })
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
