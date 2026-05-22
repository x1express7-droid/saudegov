'use client'

import { cancelarSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/solicitacao'
import { Button, Dialog, DialogContent, DialogFooter, Spinner, Textarea } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const MIN_MOTIVO = 20

export interface CancelarSolicitacaoDialogProps {
  solicitacaoId: string
  protocolo: string
}

export function CancelarSolicitacaoDialog({
  solicitacaoId,
  protocolo,
}: CancelarSolicitacaoDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setMotivo('')
      setServerError(null)
    }
  }

  function handleConfirm() {
    const motivoTrim = motivo.trim()
    if (motivoTrim.length < MIN_MOTIVO) {
      setServerError(`O motivo deve ter pelo menos ${MIN_MOTIVO} caracteres.`)
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await cancelarSolicitacaoTfd({
        solicitacaoId,
        motivo: motivoTrim,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível cancelar a solicitação.')
        return
      }

      setOpen(false)
      setMotivo('')
      router.refresh()
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={() => {
          setServerError(null)
          setOpen(true)
        }}
      >
        Cancelar solicitação
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent titulo="Cancelar solicitação TFD">
          <div className="flex flex-col gap-[var(--space-4)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              O processo <strong className="font-medium text-[var(--color-text)]">{protocolo}</strong>{' '}
              será cancelado. Esta ação não pode ser desfeita. Se houver reserva financeira ativa,
              o saldo será liberado automaticamente.
            </p>

            <Textarea
              label="Motivo do cancelamento"
              required
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              rows={4}
              disabled={isPending}
              hint={`Mínimo de ${MIN_MOTIVO} caracteres.`}
            />

            {serverError ? (
              <p
                role="alert"
                className="text-[length:var(--text-sm)] text-[var(--color-danger)]"
              >
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
                Voltar
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirm} disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-[var(--space-2)] size-4" />
                    Cancelando…
                  </>
                ) : (
                  'Confirmar cancelamento'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
