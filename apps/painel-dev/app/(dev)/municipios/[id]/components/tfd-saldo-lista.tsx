'use client'

import type { SaldoListItem } from '@saude/mod-saude-tfd/client'
import { Alert, Badge, DataTable, EmptyState, type ColumnDef } from '@saude/ui'
import { AlertTriangle, Eye, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TfdExtratoDialog } from './tfd-extrato-dialog'
import { FONTE_LABELS, formatBrl, formatCompetenciaBr } from './tfd-saldos-ui'

type SaldoTableRow = SaldoListItem & { highlightWarning?: boolean }

interface TfdSaldoListaProps {
  tenantId: string
  municipioNome: string
  items: SaldoListItem[]
}

export function TfdSaldoLista({ tenantId, municipioNome, items }: TfdSaldoListaProps) {
  const [extratoSaldo, setExtratoSaldo] = useState<SaldoListItem | null>(null)

  const saldosBaixos = useMemo(() => items.filter((item) => item.alertaBaixo && item.ativo), [items])

  const tableData = useMemo<SaldoTableRow[]>(
    () => items.map((item) => ({ ...item, highlightWarning: item.alertaBaixo })),
    [items]
  )

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
      <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
        <div className="flex flex-col gap-[var(--space-1)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Município:{' '}
            <span className="font-semibold text-[var(--color-text)]">{municipioNome}</span>
          </p>
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Visualização somente leitura dos saldos financeiros do módulo TFD (ativos e inativos).
          </p>
        </div>
        <Badge variant="gray" size="sm" className="shrink-0 gap-1">
          <Eye className="size-3" aria-hidden="true" />
          Somente leitura
        </Badge>
      </div>

      {saldosBaixos.length > 0 ? (
        <Alert variant="warning" titulo="Saldo(s) com disponibilidade crítica">
          {saldosBaixos.length === 1 && saldosBaixos[0]
            ? `“${saldosBaixos[0].descricao}” está com menos de 20% disponível neste município.`
            : `${saldosBaixos.length} saldos deste município estão com menos de 20% disponível.`}
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-6" aria-hidden="true" />}
          titulo="Nenhum saldo financeiro neste município"
          descricao="O módulo TFD está ativo, mas ainda não há saldos cadastrados pelo gestor municipal no Painel Servidor."
        />
      ) : (
        <>
          <DataTable
            data={tableData}
            columns={columns}
            pagination={pagination}
            onPaginationChange={() => {}}
            onRowClick={(row) => setExtratoSaldo(row)}
            emptyMessage="Nenhum saldo financeiro cadastrado neste município."
          />
          <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Clique em uma linha para consultar o extrato (somente leitura).
          </p>
        </>
      )}

      <TfdExtratoDialog
        tenantId={tenantId}
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
