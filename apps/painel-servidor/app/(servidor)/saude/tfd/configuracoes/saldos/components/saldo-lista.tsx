'use client'

import { desativarSaldoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { exportarSaldosTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import { TFD_PERMISSIONS, type SaldoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  type ColumnDef,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { AlertTriangle, Plus, Power, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DeactivateDialog } from '@/app/(admin)/configuracoes/organograma/components/deactivate-dialog'
import { TfdExportCsvButton } from '../../../components/tfd-export-csv-button'
import { ExtratoDialog } from './extrato-dialog'
import { SaldoForm } from './saldo-form'
import { FONTE_LABELS, formatBrl, formatCompetenciaBr } from './saldos-ui'

const BASE_PATH = '/saude/tfd/configuracoes/saldos'

type SaldoTableRow = SaldoListItem & {
  highlightWarning?: boolean
  rowMuted?: boolean
}

type DeactivateDialogState = { saldo: SaldoListItem } | null

interface SaldoListaProps {
  items: SaldoListItem[]
  session: SaudeMunicSession
  ocultarInativos: boolean
}

export function SaldoLista({ items, session, ocultarInativos }: SaldoListaProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [extratoSaldo, setExtratoSaldo] = useState<SaldoListItem | null>(null)
  const [deactivateDialog, setDeactivateDialog] = useState<DeactivateDialogState>(null)

  const saldosBaixos = useMemo(() => items.filter((item) => item.alertaBaixo && item.ativo), [items])

  const tableData = useMemo<SaldoTableRow[]>(
    () =>
      items.map((item) => ({
        ...item,
        highlightWarning: item.alertaBaixo && item.ativo,
        rowMuted: !item.ativo,
      })),
    [items]
  )

  function navigateOcultarInativos(hideInativos: boolean) {
    if (hideInativos) {
      router.push(`${BASE_PATH}?ocultarInativos=1`)
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
          <div
            className={`flex flex-col gap-[var(--space-1)] ${row.original.rowMuted ? 'opacity-60' : ''}`}
          >
            <span className="font-medium text-[var(--color-text)]">{row.original.descricao}</span>
            {row.original.alertaBaixo && row.original.ativo ? (
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
              row.original.rowMuted
                ? 'font-mono text-[length:var(--text-base)] text-[var(--color-text-muted)]'
                : row.original.alertaBaixo
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
          <span
            className={
              row.original.rowMuted
                ? 'font-mono text-[var(--color-text-muted)] opacity-60'
                : 'font-mono text-[var(--color-text-muted)]'
            }
          >
            {formatBrl(row.original.valorReservado)}
          </span>
        ),
      },
      {
        id: 'valorUtilizado',
        header: 'Utilizado',
        cell: ({ row }) => (
          <span
            className={
              row.original.rowMuted
                ? 'font-mono text-[var(--color-text-muted)] opacity-60'
                : 'font-mono text-[var(--color-text-muted)]'
            }
          >
            {formatBrl(row.original.valorUtilizado)}
          </span>
        ),
      },
      {
        id: 'valorTotal',
        header: 'Valor total',
        cell: ({ row }) => (
          <span
            className={
              row.original.rowMuted
                ? 'font-mono text-[var(--color-text-muted)] opacity-60'
                : 'font-mono text-[var(--color-text)]'
            }
          >
            {formatBrl(row.original.valorTotal)}
          </span>
        ),
      },
      {
        id: 'fonte',
        header: 'Fonte',
        cell: ({ row }) => (
          <span
            className={
              row.original.rowMuted
                ? 'text-[length:var(--text-sm)] text-[var(--color-text-muted)] opacity-60'
                : 'text-[length:var(--text-sm)] text-[var(--color-text-muted)]'
            }
          >
            {FONTE_LABELS[row.original.fonte]}
          </span>
        ),
      },
      {
        id: 'competencia',
        header: 'Competência',
        cell: ({ row }) => (
          <span
            className={
              row.original.rowMuted
                ? 'text-[length:var(--text-sm)] text-[var(--color-text-muted)] opacity-60'
                : 'text-[length:var(--text-sm)] text-[var(--color-text-muted)]'
            }
          >
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
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => {
          const item = row.original
          if (!item.ativo) {
            return (
              <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">—</span>
            )
          }

          return (
            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
              <Button
                type="button"
                variant="ghost"
                className="min-h-0 min-w-0 px-[var(--space-2)] py-[var(--space-1)]"
                onClick={(event) => {
                  event.stopPropagation()
                  setDeactivateDialog({ saldo: item })
                }}
                aria-label={`Desativar saldo ${item.descricao}`}
              >
                <Power className="size-4" aria-hidden="true" />
                Desativar
              </Button>
            </PermissionGate>
          )
        },
      },
    ],
    [session]
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
            checked={ocultarInativos}
            onChange={(event) => navigateOcultarInativos(event.target.checked)}
            className="size-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          />
          Ocultar inativos
        </label>

        <div className="flex flex-wrap items-center justify-end gap-[var(--space-2)]">
          <TfdExportCsvButton
            session={session}
            onExport={() => exportarSaldosTfdCsv({ incluirInativos: !ocultarInativos })}
          />
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
            <Button type="button" onClick={() => setFormOpen(true)} className="shrink-0">
              <Plus className="size-4" aria-hidden="true" />
              Novo saldo
            </Button>
          </PermissionGate>
        </div>
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
            Clique em uma linha para ver o extrato de movimentações. Saldos inativos permanecem na
            lista com o extrato preservado.
          </p>
        </>
      )}

      <SaldoForm open={formOpen} onOpenChange={setFormOpen} />

      <ExtratoDialog
        saldo={extratoSaldo}
        open={extratoSaldo !== null}
        session={session}
        onOpenChange={(open) => {
          if (!open) {
            setExtratoSaldo(null)
          }
        }}
      />

      {deactivateDialog ? (
        <DeactivateDialog
          open
          titulo="Desativar saldo financeiro"
          descricao={`Confirma a inativação do saldo “${deactivateDialog.saldo.descricao}”? O extrato e todas as movimentações serão preservados; o saldo deixará de aparecer em novas aprovações.`}
          onOpenChange={(open) => {
            if (!open) {
              setDeactivateDialog(null)
            }
          }}
          onConfirm={async () => {
            const response = await desativarSaldoTfd({ saldoId: deactivateDialog.saldo.id })
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
