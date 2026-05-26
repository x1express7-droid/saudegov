'use client'

import {
  TFD_PERMISSIONS,
  formatExtratoOrigemLabel,
  type ExtratoMovimentacaoItem,
  type SaldoListItem,
} from '@saude/mod-saude-tfd/client'
import { buscarExtratoSaldoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { exportarExtratoSaldoTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  Input,
  Spinner,
  type ColumnDef,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Download } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { EstornoMovimentacaoDialog } from './estorno-movimentacao-dialog'
import { ExtratoResumo, ExtratoResumoSkeleton } from './extrato-resumo'
import { formatBrl, formatDateTimeBr, MOVIMENTACAO_LABELS } from './saldos-ui'

interface ExtratoDialogProps {
  saldo: SaldoListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SaudeMunicSession
}

export function ExtratoDialog({ saldo, open, onOpenChange, session }: ExtratoDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [items, setItems] = useState<ExtratoMovimentacaoItem[]>([])
  const [total, setTotal] = useState(0)
  const [resumoSaldo, setResumoSaldo] = useState<SaldoListItem | null>(null)
  const [movimentacaoEstorno, setMovimentacaoEstorno] = useState<ExtratoMovimentacaoItem | null>(
    null
  )
  const [estornoOpen, setEstornoOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const perPage = 10

  const carregarExtrato = useCallback(() => {
    if (!saldo) {
      return
    }

    startTransition(async () => {
      setError(null)
      const response = await buscarExtratoSaldoTfd({
        saldoId: saldo.id,
        page,
        perPage,
        ...(dataInicio ? { dataInicio } : {}),
        ...(dataFim ? { dataFim } : {}),
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
  }, [saldo, page, perPage, dataInicio, dataFim])

  useEffect(() => {
    if (!open || !saldo) {
      return
    }
    setPage(1)
    setDataInicio('')
    setDataFim('')
    setError(null)
    setExportError(null)
    setSuccessMessage(null)
    setMovimentacaoEstorno(null)
    setEstornoOpen(false)
  }, [open, saldo?.id])

  useEffect(() => {
    if (!open || !saldo) {
      return
    }
    carregarExtrato()
  }, [open, saldo?.id, carregarExtrato, reloadToken])

  function handleAplicarPeriodo() {
    setPage(1)
    setSuccessMessage(null)
  }

  function handleLimparPeriodo() {
    setDataInicio('')
    setDataFim('')
    setPage(1)
    setSuccessMessage(null)
  }

  function handleExportarCsv() {
    if (!saldo) {
      return
    }

    setExportError(null)
    startExportTransition(async () => {
      const response = await exportarExtratoSaldoTfdCsv({
        saldoId: saldo.id,
        ...(dataInicio ? { dataInicio } : {}),
        ...(dataFim ? { dataFim } : {}),
      })

      if (!response.success) {
        setExportError(response.error)
        return
      }

      window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer')
    })
  }

  function handleAbrirEstorno(movimentacao: ExtratoMovimentacaoItem) {
    setMovimentacaoEstorno(movimentacao)
    setEstornoOpen(true)
  }

  function handleEstornoSucesso() {
    setSuccessMessage('Estorno registrado com sucesso.')
    setReloadToken((token) => token + 1)
  }

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
        id: 'situacao',
        header: 'Situação',
        cell: ({ row }) => {
          const item = row.original

          if (item.tipo === 'ESTORNO' && item.movimentacaoOrigem) {
            return (
              <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Ref.: {formatExtratoOrigemLabel(item.movimentacaoOrigem)}
              </span>
            )
          }

          if (item.jaEstornada) {
            return (
              <Badge variant="orange" size="sm">
                Estornado
              </Badge>
            )
          }

          if (item.podeEstornar) {
            return (
              <Badge variant="teal" size="sm">
                Estornável
              </Badge>
            )
          }

          return <span className="text-[var(--color-text-subtle)]">—</span>
        },
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
      {
        id: 'acoes',
        header: '',
        cell: ({ row }) => {
          if (!row.original.podeEstornar) {
            return null
          }

          return (
            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleAbrirEstorno(row.original)}
              >
                Estornar
              </Button>
            </PermissionGate>
          )
        },
      },
    ],
    [session]
  )

  const titulo = saldo ? `Extrato — ${saldo.descricao}` : 'Extrato de saldo'
  const periodoLabel =
    dataInicio || dataFim
      ? `${dataInicio ? dataInicio.split('-').reverse().join('/') : '…'} — ${dataFim ? dataFim.split('-').reverse().join('/') : '…'}`
      : 'Todo o período'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent titulo={titulo} className="max-w-5xl">
          <div className="max-h-[min(70vh,36rem)] overflow-y-auto pr-[var(--space-1)]">
            {isPending && !resumoSaldo ? <ExtratoResumoSkeleton /> : null}
            {resumoSaldo ? <ExtratoResumo saldo={resumoSaldo} /> : null}

            <div className="mb-[var(--space-4)] flex flex-col gap-[var(--space-3)] rounded-[var(--radius-sm)] border border-[var(--color-border)] p-[var(--space-3)]">
              <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                Período do extrato
              </p>
              <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                <div className="flex flex-col gap-[var(--space-1)]">
                  <label
                    htmlFor="extrato-data-inicio"
                    className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
                  >
                    Data início
                  </label>
                  <Input
                    id="extrato-data-inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(event) => setDataInicio(event.target.value)}
                    disabled={isPending || isExporting}
                  />
                </div>
                <div className="flex flex-col gap-[var(--space-1)]">
                  <label
                    htmlFor="extrato-data-fim"
                    className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
                  >
                    Data fim
                  </label>
                  <Input
                    id="extrato-data-fim"
                    type="date"
                    value={dataFim}
                    onChange={(event) => setDataFim(event.target.value)}
                    disabled={isPending || isExporting}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAplicarPeriodo}
                  disabled={isPending || isExporting}
                >
                  Aplicar período
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleLimparPeriodo}
                  disabled={isPending || isExporting || (!dataInicio && !dataFim)}
                >
                  Limpar
                </Button>
                <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Exibindo: {periodoLabel}
                  {total > 0 ? ` · ${total} movimentação(ões)` : ''}
                </span>
              </div>
            </div>

            {successMessage ? (
              <Alert variant="success" role="status" className="mb-[var(--space-4)]">
                {successMessage}
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="error" role="alert" className="mb-[var(--space-4)]">
                {error}
              </Alert>
            ) : null}

            {exportError ? (
              <Alert variant="error" role="alert" className="mb-[var(--space-4)]">
                {exportError}
              </Alert>
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
                emptyMessage="Nenhuma movimentação registrada neste saldo no período selecionado."
              />
            )}

            <div className="mt-[var(--space-4)] flex flex-wrap items-center justify-end gap-[var(--space-2)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
              <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!saldo || isExporting || isPending}
                  aria-busy={isExporting}
                  onClick={handleExportarCsv}
                >
                  <Download className="size-4" aria-hidden="true" />
                  {isExporting ? 'Exportando…' : 'Exportar CSV'}
                </Button>
              </PermissionGate>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EstornoMovimentacaoDialog
        movimentacao={movimentacaoEstorno}
        open={estornoOpen}
        onOpenChange={setEstornoOpen}
        onSuccess={handleEstornoSucesso}
      />
    </>
  )
}
