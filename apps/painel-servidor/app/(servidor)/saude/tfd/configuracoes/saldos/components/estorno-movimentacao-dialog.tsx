'use client'

import { estornarMovimentacaoSaldoTfd } from '@saude/mod-saude-tfd/actions/financeiro'
import { labelTipoMovimentacao, type ExtratoMovimentacaoItem } from '@saude/mod-saude-tfd/client'
import { Button, Dialog, DialogContent, DialogFooter, Spinner, Textarea } from '@saude/ui'
import { useState, useTransition } from 'react'
import { formatBrl, formatDateTimeBr } from './saldos-ui'

const MIN_JUSTIFICATIVA = 20

export interface EstornoMovimentacaoDialogProps {
  movimentacao: ExtratoMovimentacaoItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EstornoMovimentacaoDialog({
  movimentacao,
  open,
  onOpenChange,
  onSuccess,
}: EstornoMovimentacaoDialogProps) {
  const [justificativa, setJustificativa] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setJustificativa('')
      setServerError(null)
    }
  }

  function handleConfirm() {
    if (!movimentacao) {
      return
    }

    const texto = justificativa.trim()
    if (texto.length < MIN_JUSTIFICATIVA) {
      setServerError(`A justificativa deve ter pelo menos ${MIN_JUSTIFICATIVA} caracteres.`)
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await estornarMovimentacaoSaldoTfd({
        movimentacaoId: movimentacao.id,
        justificativa: texto,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar o estorno.')
        return
      }

      setJustificativa('')
      handleOpenChange(false)
      onSuccess()
    })
  }

  if (!movimentacao) {
    return null
  }

  const tipoLabel = labelTipoMovimentacao(movimentacao.tipo)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent titulo="Estornar movimentação">
        <div className="flex flex-col gap-[var(--space-4)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Será criado um novo lançamento do tipo <strong className="text-[var(--color-text)]">Estorno</strong>{' '}
            com valor oposto ao original. O registro atual permanece no extrato (imutável).
          </p>

          <dl className="grid gap-[var(--space-2)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-3)] text-[length:var(--text-sm)]">
            <div className="flex flex-wrap justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)]">
              <dt className="text-[var(--color-text-muted)]">Tipo</dt>
              <dd className="font-medium text-[var(--color-text)]">{tipoLabel}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)]">
              <dt className="text-[var(--color-text-muted)]">Valor</dt>
              <dd className="font-mono font-medium text-[var(--color-text)]">
                {formatBrl(movimentacao.valor)}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)]">
              <dt className="text-[var(--color-text-muted)]">Data</dt>
              <dd className="text-[var(--color-text)]">{formatDateTimeBr(movimentacao.criadoEm)}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Descrição</dt>
              <dd className="mt-[var(--space-1)] text-[var(--color-text)]">{movimentacao.descricao}</dd>
            </div>
            {movimentacao.protocolo ? (
              <div className="flex flex-wrap justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)]">
                <dt className="text-[var(--color-text-muted)]">Protocolo</dt>
                <dd className="font-mono text-[var(--color-text)]">{movimentacao.protocolo}</dd>
              </div>
            ) : null}
          </dl>

          <Textarea
            label="Justificativa do estorno"
            required
            value={justificativa}
            onChange={(event) => setJustificativa(event.target.value)}
            rows={4}
            disabled={isPending}
            hint={`Mínimo de ${MIN_JUSTIFICATIVA} caracteres. Descreva o motivo da correção financeira.`}
          />

          {serverError ? (
            <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-danger)]">
              {serverError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirm} disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-[var(--space-2)] size-4" />
                  Registrando…
                </>
              ) : (
                'Confirmar estorno'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
