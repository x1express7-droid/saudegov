'use client'

import { TFD_PERMISSIONS, type SaldoListItem } from '@saude/mod-saude-tfd'
import type { SaudeMunicSession } from '@saude/core-auth'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  PermissionGate,
  type ColumnDef,
} from '@saude/ui'
import { AlertTriangle, Plus, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ExtratoDialog } from './extrato-dialog'
import { SaldoForm } from './saldo-form'
import { FONTE_LABELS, formatBrl, formatCompetenciaBr } from './saldos-ui'

const BASE_PATH = '/saude/tfd/configuracoes/saldos'

type SaldoTableRow = SaldoListItem & { highlightWarning?: boolean }

interface SaldoListaProps {
  items: SaldoListItem[]
  session: SaudeMunicSession
  incluirInativos: boolean
}

export function SaldoLista({ items, session, incluirInativos }: SaldoListaProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [extratoSaldo, setExtratoSaldo] = useState<SaldoListItem | null>(null)

  const saldosBaixos = useMemo(() => items.filter((item) => item.alertaBaixo && item.ativo), [items])

  const tableData = useMemo<SaldoTableRow[]>(
    () => items.map((item) => ({ ...item, highlightWarning: item.alertaBaixo })),
    [items]
  )

  function navigateInativos(showInativos: boolean) {
    if (showInativos) {
      router.push(`${BASE_PATH}?incluirInativos=1`)
      return
    }
    router.push(BASE_PATH)
  }

  const columns = useMemo<ColumnDef<SaldoTableRow>[]>(
    () => [
      {
        id: 'descricao',
        header: 'Descrição',
        cell: ({ row }) => (
          <div className="flex flex-col gap-[var(--space-1)]">
            <span className="font-medium text-[var(--color-text)]">{row.original.descricao}</span>
            {row.original.alertaBaixo ? (
              <Badge variant="yellow" size="sm" className="w-fit gap-1">
                <AlertTriangle className="size-3" aria-hidden="true" />
                Saldo baixo
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: 'valorDisponivel',
        header: 'Disponível',
        cell: ({ row }) => (
          <span
            className={
              row.original.alertaBaixo
                ? 'font-mono text-[length:var(--text-base)] font-semibold text-[var(--color-warning)]'
                : 'font-mono text-[length:var(--text-base)] font-semibold text-[var(--color-text)]'
            }
          >
            {formatBrl(row.original.valorDisponivel)}
            <span className="ml-1 text-[length:var(--text-xs)] font-normal text-[var(--color-text-muted)]">
              ({row.original.percentualDisponivel.toFixed(1)}%)
            </span>
          </span>
        ),
      },
      {
        id: 'valorReservado',
        header: 'Reservado',
        cell: ({ row }) => (
          <span className="font-mono text-[var(--color-text-muted)]">
            {formatBrl(row.original.valorReservado)}
          </span>
        ),
      },
      {
        id: 'valorUtilizado',
        header: 'Utilizado',
        cell: ({ row }) => (
          <span className="font-mono text-[var(--color-text-muted)]">
            {formatBrl(row.original.valorUtilizado)}
          </span>
        ),
      },
      {
        id: 'valorTotal',
        header: 'Valor total',
        cell: ({ row }) => (
          <span className="font-mono text-[var(--color-text)]">
            {formatBrl(row.original.valorTotal)}
          </span>
        ),
      },
      {
        id: 'fonte',
        header: 'Fonte',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {FONTE_LABELS[row.original.fonte]}
          </span>
        ),
      },
      {
        id: 'competencia',
        header: 'Competência',
        cell: ({ row }) => (
          <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {formatCompetenciaBr(row.original.competenciaInicio, row.original.competenciaFim)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.ativo ? 'green' : 'gray'}>
            {row.original.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
      },
    ],
    []
  )

  const pagination = {
    page: 1,
    perPage: Math.max(tableData.length, 1),
    total: tableData.length,
  }

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {saldosBaixos.length > 0 ? (
        <Alert variant="warning" titulo="Atenção: saldo(s) com menos de 20% disponível">
          {saldosBaixos.length === 1 && saldosBaixos[0]
            ? `O saldo “${saldosBaixos[0].descricao}” está baixo. Revise o recurso antes de aprovar novas solicitações TFD.`
            : `${saldosBaixos.length} saldos estão com disponibilidade crítica. Revise os recursos antes de aprovar novas solicitações TFD.`}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={incluirInativos}
            onChange={(event) => navigateInativos(event.target.checked)}
            className="size-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          />
          Mostrar inativos
        </label>

        <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
          <Button type="button" onClick={() => setFormOpen(true)} className="shrink-0">
            <Plus className="size-4" aria-hidden="true" />
            Novo saldo
          </Button>
        </PermissionGate>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-6" aria-hidden="true" />}
          titulo="Nenhum saldo financeiro cadastrado"
          descricao="Cadastre a primeira fonte de recurso para o TFD. O valor informado será creditado automaticamente no extrato."
          cta={
            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
              <Button type="button" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Cadastrar primeiro saldo
              </Button>
            </PermissionGate>
          }
        />
      ) : (
        <>
          <DataTable
            data={tableData}
            columns={columns}
            pagination={pagination}
            onPaginationChange={() => {}}
            onRowClick={(row) => setExtratoSaldo(row)}
            emptyMessage="Nenhum saldo financeiro cadastrado."
          />
          <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Clique em uma linha para ver o extrato de movimentações.
          </p>
        </>
      )}

      <SaldoForm open={formOpen} onOpenChange={setFormOpen} />

      <ExtratoDialog
        saldo={extratoSaldo}
        open={extratoSaldo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExtratoSaldo(null)
          }
        }}
      />
    </div>
  )
}
