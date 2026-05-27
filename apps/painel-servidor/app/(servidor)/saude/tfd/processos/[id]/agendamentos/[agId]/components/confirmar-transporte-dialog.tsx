'use client'

import { confirmarTransporte } from '@saude/mod-saude-tfd/actions/transporte'
import type { TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'
import { Button, Dialog, DialogContent, DialogFooter, Spinner } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { formatDataHora, labelTipoSegmento } from './transporte-constants'

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface ConfirmarTransporteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporte: TransporteAgendamentoItem | null
}

export function ConfirmarTransporteDialog({
  open,
  onOpenChange,
  transporte,
}: ConfirmarTransporteDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  function handleConfirmar() {
    if (!transporte) {
      return
    }

    setServerError(null)

    startTransition(async () => {
      const result = await confirmarTransporte({ transporteId: transporte.id })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível confirmar o transporte.')
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent titulo="Confirmar transporte">
        {transporte ? (
          <div className="flex flex-col gap-[var(--space-3)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              Confirmar o segmento {transporte.sequencia} ({labelTipoSegmento(transporte.tipoSegmento)}
              ) de <strong>{transporte.origemDescricao}</strong> para{' '}
              <strong>{transporte.destinoDescricao}</strong>, com saída em{' '}
              {formatDataHora(transporte.dataSaida, transporte.horaSaida)}?
            </p>
            <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              O status passará para Confirmado (passagem emitida ou veículo reservado).
            </p>
            {serverError ? <ServerError message={serverError} /> : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirmar} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-[var(--space-2)] size-4" />
                Confirmando…
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
