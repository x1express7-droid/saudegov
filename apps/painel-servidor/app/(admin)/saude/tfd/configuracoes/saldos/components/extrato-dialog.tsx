'use client'

import {
  buscarExtratoSaldoTfd,
  type ExtratoMovimentacaoItem,
  type SaldoListItem,
} from '@saude/mod-saude-tfd'
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  Spinner,
  type ColumnDef,
} from '@saude/ui'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { ExtratoResumo, ExtratoResumoSkeleton } from './extrato-resumo'
import { formatBrl, formatDateTimeBr, MOVIMENTACAO_LABELS } from './saldos-ui'

interface ExtratoDialogProps {
  saldo: SaldoListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExtratoDialog({ saldo, open, onOpenChange }: ExtratoDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ExtratoMovimentacaoItem[]>([])
  const [total, setTotal] = useState(0)
  const [resumoSaldo, setResumoSaldo] = useState<SaldoListItem | null>(null)

  const perPage = 10

  useEffect(() => {
    if (!open || !saldo) {
      return
    }
    setPage(1)
  }, [open, saldo?.id])

  useEffect(() => {
    if (!open || !saldo) {
      return
    }

    startTransition(async () => {
      setError(null)
      const response = await buscarExtratoSaldoTfd({
        saldoId: saldo.id,
        page,
        perPage,
      })

      if (!response.success) {
        setError(response.error)
        setItems([])
        setTotal(0)
        setResumoSaldo(null)
        return
      }

      setItems(response.data.items)
      setTotal(response.data.total)
      setResumoSaldo(response.data.saldo)
    })
  }, [open, saldo?.id, page])

  const columns = useMemo<ColumnDef<ExtratoMovimentacaoItem>[]>(
    () => [
      {
        id: 'criadoEm',
        header: 'Data',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">
            {formatDateTimeBr(row.original.criadoEm)}
          </span>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => (
          <Badge variant="gray" size="sm">
            {MOVIMENTACAO_LABELS[row.original.tipo] ?? row.original.tipo}
          </Badge>
        ),
      },
      {
        id: 'valor',
        header: 'Valor',
        cell: ({ row }) => (
          <span className="font-mono text-[var(--color-text)]">
            {formatBrl(row.original.valor)}
          </span>
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
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) =>
          row.original.protocolo ? (
            <span className="font-mono text-[length:var(--text-xs)] text-[var(--color-text)]">
              {row.original.protocolo}
            </span>
          ) : (
            <span className="text-[var(--color-text-subtle)]">—</span>
          ),
      },
      {
        id: 'usuario',
        header: 'Usuário',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">{row.original.usuarioNome}</span>
        ),
      },
    ],
    []
  )

  const titulo = saldo ? `Extrato — ${saldo.descricao}` : 'Extrato de saldo'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent titulo={titulo} className="max-w-4xl">
        <div className="max-h-[min(70vh,36rem)] overflow-y-auto pr-[var(--space-1)]">
          {isPending && !resumoSaldo ? <ExtratoResumoSkeleton /> : null}
          {resumoSaldo ? <ExtratoResumo saldo={resumoSaldo} /> : null}

          {error ? (
            <p role="alert" className="mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-error)]">
              {error}
            </p>
          ) : null}

          {isPending && items.length === 0 ? (
            <div
              className="flex min-h-[200px] items-center justify-center"
              aria-busy="true"
              aria-live="polite"
            >
              <Spinner className="size-8 text-[var(--color-primary)]" />
            </div>
          ) : (
            <DataTable
              data={items}
              columns={columns}
              pagination={{ page, perPage, total }}
              onPaginationChange={setPage}
              loading={isPending && items.length > 0}
              emptyMessage="Nenhuma movimentação registrada neste saldo."
            />
          )}

          <div className="mt-[var(--space-4)] flex justify-end border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
