'use client'

import { registrarChegadaTransporte } from '@saude/mod-saude-tfd/actions/transporte'
import type { TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'
import { Button, Dialog, DialogContent, DialogFooter, Input, Spinner } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { labelTipoSegmento } from './transporte-constants'

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface RegistrarChegadaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporte: TransporteAgendamentoItem | null
}

export function RegistrarChegadaDialog({
  open,
  onOpenChange,
  transporte,
}: RegistrarChegadaDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [kmChegada, setKmChegada] = useState('')
  const [dataChegada, setDataChegada] = useState('')
  const [horaChegada, setHoraChegada] = useState('')

  function resetForm() {
    setKmChegada('')
    setDataChegada('')
    setHoraChegada('')
    setServerError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetForm()
    }
    onOpenChange(next)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!transporte) {
      return
    }

    setServerError(null)

    const km = kmChegada.trim() ? Number.parseInt(kmChegada, 10) : undefined
    if (kmChegada.trim() && (!Number.isFinite(km) || (km ?? 0) <= 0)) {
      setServerError('Informe uma quilometragem de chegada válida.')
      return
    }

    startTransition(async () => {
      const result = await registrarChegadaTransporte({
        transporteId: transporte.id,
        kmChegada: km,
        dataChegada: dataChegada.trim() || undefined,
        horaChegada: horaChegada.trim() || undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar a chegada.')
        return
      }

      handleOpenChange(false)
      router.refresh()
    })
  }

  const exigeKm = transporte?.tipoSegmento === 'TERRESTRE_PROPRIO'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent titulo="Registrar chegada">
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
          {transporte ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Segmento {transporte.sequencia} — {labelTipoSegmento(transporte.tipoSegmento)}:{' '}
              {transporte.origemDescricao} → {transporte.destinoDescricao}
            </p>
          ) : null}

          {exigeKm ? (
            <Input
              label="Quilometragem de chegada (opcional)"
              type="number"
              inputMode="numeric"
              min={1}
              value={kmChegada}
              onChange={(event) => setKmChegada(event.target.value)}
              disabled={isPending}
            />
          ) : null}

          <Input
            label="Data de chegada (opcional)"
            type="date"
            value={dataChegada}
            onChange={(event) => setDataChegada(event.target.value)}
            disabled={isPending}
          />

          <Input
            label="Hora de chegada (opcional)"
            type="time"
            value={horaChegada}
            onChange={(event) => setHoraChegada(event.target.value)}
            disabled={isPending}
          />

          {serverError ? <ServerError message={serverError} /> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-[var(--space-2)] size-4" />
                  Registrando…
                </>
              ) : (
                'Registrar chegada'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
