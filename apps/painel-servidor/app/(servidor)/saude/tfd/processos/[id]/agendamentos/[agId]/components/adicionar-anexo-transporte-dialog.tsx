'use client'

import { adicionarAnexoTransporte } from '@saude/mod-saude-tfd/actions/transporte'
import type { TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'
import { Button, Dialog, DialogContent, DialogFooter, Select, Spinner } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { DespesaComprovanteUpload } from '@/app/(servidor)/saude/tfd/[id]/components/despesa-comprovante-upload'

import { labelTipoSegmento, TIPO_ANEXO_OPTIONS } from './transporte-constants'

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface AdicionarAnexoTransporteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processoId: string
  transporte: TransporteAgendamentoItem | null
}

export function AdicionarAnexoTransporteDialog({
  open,
  onOpenChange,
  processoId,
  transporte,
}: AdicionarAnexoTransporteDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [tipoAnexo, setTipoAnexo] = useState('OUTRO')
  const [anexoId, setAnexoId] = useState<string | null>(null)
  const [uploadKey, setUploadKey] = useState(0)

  function resetForm() {
    setTipoAnexo('OUTRO')
    setAnexoId(null)
    setUploadKey((key) => key + 1)
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

    if (!anexoId) {
      setServerError('Envie o arquivo antes de vincular ao segmento.')
      return
    }

    setServerError(null)

    startTransition(async () => {
      const result = await adicionarAnexoTransporte({
        transporteId: transporte.id,
        anexoId,
        tipoAnexo,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível adicionar o anexo.')
        return
      }

      handleOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent titulo="Adicionar anexo ao segmento">
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
          {transporte ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Segmento {transporte.sequencia} — {labelTipoSegmento(transporte.tipoSegmento)}:{' '}
              {transporte.origemDescricao} → {transporte.destinoDescricao}
            </p>
          ) : null}

          <Select
            label="Tipo de anexo"
            value={tipoAnexo}
            onValueChange={setTipoAnexo}
            options={[...TIPO_ANEXO_OPTIONS]}
            disabled={isPending}
          />

          <DespesaComprovanteUpload
            key={uploadKey}
            processoId={processoId}
            disabled={isPending}
            onUploadComplete={setAnexoId}
            onUploadClear={() => setAnexoId(null)}
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
            <Button type="submit" variant="primary" disabled={isPending || !anexoId}>
              {isPending ? (
                <>
                  <Spinner className="mr-[var(--space-2)] size-4" />
                  Salvando…
                </>
              ) : (
                'Vincular anexo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
