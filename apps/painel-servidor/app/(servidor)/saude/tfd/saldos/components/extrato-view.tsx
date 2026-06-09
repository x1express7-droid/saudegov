'use client'

import {
  TFD_PERMISSIONS,
  type ExtratoMovimentacaoItem,
  type SaldoListItem,
} from '@saude/mod-saude-tfd/client'
import { buscarExtratoSaldoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { exportarExtratoSaldoTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Alert, Button, Input, Spinner } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Download } from 'lucide-react'
import { useCallback, useEffect, useState, useTransition } from 'react'

import { EstornoMovimentacaoDialog } from './estorno-movimentacao-dialog'
import { ExtratoListaCompactaView } from './extrato-lista-compacta-view'
import { ExtratoListaPaginacao } from './extrato-lista-paginacao'
import { SaldoResumoFinanceiro } from './saldo-resumo-financeiro'

// BLOCO-11-SALDOS
export interface ExtratoViewProps {
  saldo: SaldoListItem
  session: SaudeMunicSession
}

export function ExtratoView({ saldo, session }: ExtratoViewProps) {
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [dataInicioInput, setDataInicioInput] = useState('')
  const [dataFimInput, setDataFimInput] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [items, setItems] = useState<ExtratoMovimentacaoItem[]>([])
  const [total, setTotal] = useState(0)
  const [resumoSaldo, setResumoSaldo] = useState<SaldoListItem>(saldo)
  const [movimentacaoEstorno, setMovimentacaoEstorno] = useState<ExtratoMovimentacaoItem | null>(
    null
  )
  const [estornoOpen, setEstornoOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const perPage = 10

  const carregarExtrato = useCallback(() => {
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
        return
      }

      setItems(response.data.items)
      setTotal(response.data.total)
      setResumoSaldo(response.data.saldo)
    })
  }, [saldo.id, page, perPage, dataInicio, dataFim])

  useEffect(() => {
    carregarExtrato()
  }, [carregarExtrato, reloadToken])

  function handleAplicarPeriodo() {
    setDataInicio(dataInicioInput)
    setDataFim(dataFimInput)
    setPage(1)
    setSuccessMessage(null)
  }

  function handleLimparPeriodo() {
    setDataInicioInput('')
    setDataFimInput('')
    setDataInicio('')
    setDataFim('')
    setPage(1)
    setSuccessMessage(null)
  }

  function handleExportarCsv() {
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

  const periodoLabel =
    dataInicio || dataFim
      ? `${dataInicio ? dataInicio.split('-').reverse().join('/') : '…'} — ${dataFim ? dataFim.split('-').reverse().join('/') : '…'}`
      : 'Todo o período'

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SaldoResumoFinanceiro saldo={resumoSaldo} />

      <div className="flex flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-4)]">
        <div className="grid gap-[var(--space-3)] md:grid-cols-2">
          <Input
            id="extrato-data-inicio"
            label="Data início"
            type="date"
            value={dataInicioInput}
            onChange={(event) => setDataInicioInput(event.target.value)}
            disabled={isPending || isExporting}
          />
          <Input
            id="extrato-data-fim"
            label="Data fim"
            type="date"
            value={dataFimInput}
            onChange={(event) => setDataFimInput(event.target.value)}
            disabled={isPending || isExporting}
          />
        </div>
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <Button
            type="button"
            variant="primary"
            onClick={handleAplicarPeriodo}
            disabled={isPending || isExporting}
          >
            Aplicar
          </Button>
          <button
            type="button"
            className="text-[length:var(--text-xs)] text-[var(--color-primary)] hover:underline disabled:opacity-50"
            onClick={handleLimparPeriodo}
            disabled={
              isPending ||
              isExporting ||
              (!dataInicioInput && !dataFimInput && !dataInicio && !dataFim)
            }
          >
            Limpar
          </button>
          <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Exibindo: {periodoLabel}
            {total > 0 ? ` · ${total} movimentação(ões)` : ''}
          </span>
        </div>
      </div>

      {successMessage ? (
        <Alert variant="success" role="status">
          {successMessage}
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      ) : null}

      {exportError ? (
        <Alert variant="error" role="alert">
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
        <>
          <ExtratoListaCompactaView
            items={items}
            session={session}
            loading={isPending && items.length > 0}
            onEstornar={handleAbrirEstorno}
          />
          <ExtratoListaPaginacao
            page={page}
            perPage={perPage}
            total={total}
            onPaginationChange={setPage}
          />
        </>
      )}

      <div className="flex justify-end">
        <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
          <Button
            type="button"
            variant="outline"
            disabled={isExporting || isPending}
            aria-busy={isExporting}
            onClick={handleExportarCsv}
          >
            <Download className="size-4" aria-hidden="true" />
            {isExporting ? 'Exportando…' : 'Exportar CSV'}
          </Button>
        </PermissionGate>
      </div>

      <EstornoMovimentacaoDialog
        movimentacao={movimentacaoEstorno}
        open={estornoOpen}
        onOpenChange={setEstornoOpen}
        onSuccess={handleEstornoSucesso}
      />
    </div>
  )
}
