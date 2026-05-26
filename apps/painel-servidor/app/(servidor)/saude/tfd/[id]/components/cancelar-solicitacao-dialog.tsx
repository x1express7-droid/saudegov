'use client'

import { cancelarSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/solicitacao'
import {
  TEXTO_MOTIVO_CANCELAMENTO_PRAZO_ESGOTADO,
  type MotivoCancelamentoPreset,
} from '@saude/mod-saude-tfd/client'
import { Button, Dialog, DialogContent, DialogFooter, Select, Spinner, Textarea } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

const MIN_MOTIVO = 20

const MOTIVO_PRESET_OPTIONS = [
  { value: 'PRAZO_ESGOTADO', label: 'Prazo esgotado (60 dias sem complemento)' },
  { value: 'OUTRO', label: 'Outro motivo' },
] as const

export interface CancelarSolicitacaoDialogProps {
  solicitacaoId: string
  protocolo: string
  /** Cancelamento por prazo de complemento (PENDENTE ≥ 60 dias). */
  modoPrazoEsgotado?: boolean
  /** Abre o dialog ao montar (ex.: link do dashboard). */
  abrirInicialmente?: boolean
}

export function CancelarSolicitacaoDialog({
  solicitacaoId,
  protocolo,
  modoPrazoEsgotado = false,
  abrirInicialmente = false,
}: CancelarSolicitacaoDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(abrirInicialmente)
  const [motivo, setMotivo] = useState('')
  const [motivoPreset, setMotivoPreset] = useState<MotivoCancelamentoPreset>('PRAZO_ESGOTADO')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (abrirInicialmente) {
      setOpen(true)
    }
  }, [abrirInicialmente])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setMotivo('')
      setMotivoPreset('PRAZO_ESGOTADO')
      setServerError(null)
    }
  }

  function handleConfirm() {
    const motivoTrim = motivo.trim()

    if (!modoPrazoEsgotado && motivoTrim.length < MIN_MOTIVO) {
      setServerError(`O motivo deve ter pelo menos ${MIN_MOTIVO} caracteres.`)
      return
    }

    if (modoPrazoEsgotado && motivoPreset === 'OUTRO' && motivoTrim.length < MIN_MOTIVO) {
      setServerError(`O motivo deve ter pelo menos ${MIN_MOTIVO} caracteres.`)
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await cancelarSolicitacaoTfd({
        solicitacaoId,
        motivo: motivoTrim,
        ...(modoPrazoEsgotado ? { motivoPreset } : { motivoPreset: 'OUTRO' as const }),
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível cancelar a solicitação.')
        return
      }

      setOpen(false)
      setMotivo('')
      setMotivoPreset('PRAZO_ESGOTADO')
      router.refresh()
    })
  }

  const tituloDialog = modoPrazoEsgotado
    ? 'Cancelar por prazo esgotado'
    : 'Cancelar solicitação TFD'

  const textoMotivoCanonico =
    modoPrazoEsgotado && motivoPreset === 'PRAZO_ESGOTADO'
      ? TEXTO_MOTIVO_CANCELAMENTO_PRAZO_ESGOTADO
      : null

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
        {modoPrazoEsgotado ? 'Cancelar por prazo esgotado' : 'Cancelar solicitação'}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent titulo={tituloDialog}>
          <div className="flex flex-col gap-[var(--space-4)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              O processo{' '}
              <strong className="font-medium text-[var(--color-text)]">{protocolo}</strong> será
              cancelado. Esta ação não pode ser desfeita. Se houver reserva financeira ativa, o
              saldo será liberado automaticamente.
            </p>

            {modoPrazoEsgotado ? (
              <>
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  O complemento foi solicitado há 60 dias ou mais sem retorno do solicitante.
                </p>

                <Select
                  label="Motivo do cancelamento"
                  required
                  value={motivoPreset}
                  onValueChange={(value) =>
                    setMotivoPreset(value as MotivoCancelamentoPreset)
                  }
                  options={[...MOTIVO_PRESET_OPTIONS]}
                  disabled={isPending}
                />

                <Textarea
                  label={
                    motivoPreset === 'PRAZO_ESGOTADO'
                      ? 'Observações complementares (opcional)'
                      : 'Motivo do cancelamento'
                  }
                  required={motivoPreset === 'OUTRO'}
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  rows={4}
                  disabled={isPending}
                  hint={
                    motivoPreset === 'PRAZO_ESGOTADO'
                      ? `Se vazio ou curto, será registrado o texto padrão de prazo esgotado. Para texto próprio, use "Outro motivo" (mín. ${MIN_MOTIVO} caracteres).`
                      : `Mínimo de ${MIN_MOTIVO} caracteres.`
                  }
                />

                {textoMotivoCanonico && motivo.trim().length < MIN_MOTIVO ? (
                  <p className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Texto registrado se confirmar sem observações: {textoMotivoCanonico}
                  </p>
                ) : null}
              </>
            ) : (
              <Textarea
                label="Motivo do cancelamento"
                required
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                rows={4}
                disabled={isPending}
                hint={`Mínimo de ${MIN_MOTIVO} caracteres.`}
              />
            )}

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
