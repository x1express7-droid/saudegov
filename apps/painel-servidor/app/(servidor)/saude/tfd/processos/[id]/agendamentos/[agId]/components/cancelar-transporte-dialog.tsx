'use client'

import { cancelarTransporte } from '@saude/mod-saude-tfd/actions/transporte'
import type { TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'
import { Button, Dialog, DialogContent, DialogFooter, Spinner, Textarea } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { labelTipoSegmento } from './transporte-constants'

const MIN_MOTIVO = 20

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface CancelarTransporteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporte: TransporteAgendamentoItem | null
}

export function CancelarTransporteDialog({
  open,
  onOpenChange,
  transporte,
}: CancelarTransporteDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      setMotivo('')
      setServerError(null)
    }
    onOpenChange(next)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!transporte) {
      return
    }

    const motivoTrim = motivo.trim()
    if (motivoTrim.length < MIN_MOTIVO) {
      setServerError(`O motivo deve ter pelo menos ${MIN_MOTIVO} caracteres.`)
      return
    }

    setServerError(null)

    startTransition(async () => {
      const result = await cancelarTransporte({
        transporteId: transporte.id,
        motivo: motivoTrim,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível cancelar o transporte.')
        return
      }

      handleOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent titulo="Cancelar transporte">
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
          {transporte ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Segmento {transporte.sequencia} — {labelTipoSegmento(transporte.tipoSegmento)}:{' '}
              {transporte.origemDescricao} → {transporte.destinoDescricao}
            </p>
          ) : null}

          <Textarea
            label="Motivo do cancelamento"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            rows={4}
            disabled={isPending}
            hint={`Mínimo de ${MIN_MOTIVO} caracteres.`}
            required
          />

          {serverError ? <ServerError message={serverError} /> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Voltar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
