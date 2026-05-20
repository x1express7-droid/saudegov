'use client'

import { Button, Dialog, DialogContent, DialogFooter, Spinner } from '@saude/ui'
import { useState, useTransition } from 'react'

interface DeactivateDialogProps {
  open: boolean
  titulo: string
  descricao: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<{ success: boolean; error?: string }>
}

export function DeactivateDialog({
  open,
  titulo,
  descricao,
  onOpenChange,
  onConfirm,
}: DeactivateDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await onConfirm()
      if (!result.success) {
        setError(result.error ?? 'Não foi possível desativar.')
        return
      }
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent titulo={titulo} descricao={descricao}>
        {error ? (
          <p role="alert" className="mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-error)]">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" disabled={isPending} onClick={handleConfirm}>
            {isPending ? (
              <>
                <Spinner className="size-4" />
                Desativando…
              </>
            ) : (
              'Desativar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
