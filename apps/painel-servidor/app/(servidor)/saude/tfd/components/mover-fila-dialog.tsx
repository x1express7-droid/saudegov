'use client'

import { moverPacienteNaFila } from '@saude/mod-saude-tfd/actions/fila'
import { MIN_JUSTIFICATIVA_FILA_CHARS } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Select,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const TIPO_OPTIONS = [
  { value: 'AVANCO', label: 'Avanço de posição' },
  { value: 'RECUO', label: 'Recuo de posição' },
  { value: 'PRIORIDADE', label: 'Prioridade na fila' },
] as const

type TipoMovimentacao = (typeof TIPO_OPTIONS)[number]['value']

function inferTipoMovimentacao(
  posicaoAtual: number,
  posicaoNova: number
): TipoMovimentacao {
  if (posicaoNova === 1 && posicaoAtual > 1) {
    return 'PRIORIDADE'
  }
  if (posicaoNova < posicaoAtual) {
    return 'AVANCO'
  }
  return 'RECUO'
}

export interface MoverFilaDialogProps {
  session: SaudeMunicSession
  solicitacaoId: string
  protocolo: string
  posicaoAtual: number
  /** BLOCO-6-SOLICITACOES: controle externo do dialog (menu de ações). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

export function MoverFilaDialog({
  session,
  solicitacaoId,
  protocolo,
  posicaoAtual,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
  hideTrigger = false,
}: MoverFilaDialogProps) {
  const router = useRouter()
  const [openInternal, setOpenInternal] = useState(false)
  const isControlled = openControlled !== undefined
  const open = isControlled ? openControlled : openInternal
  const [posicaoNova, setPosicaoNova] = useState(String(posicaoAtual))
  const [tipoMovimentacao, setTipoMovimentacao] = useState<TipoMovimentacao>(
    inferTipoMovimentacao(posicaoAtual, posicaoAtual)
  )
  const [justificativa, setJustificativa] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(nextOpen: boolean) {
    if (isControlled) {
      onOpenChangeControlled?.(nextOpen)
    } else {
      setOpenInternal(nextOpen)
    }
    if (!nextOpen) {
      setPosicaoNova(String(posicaoAtual))
      setTipoMovimentacao(inferTipoMovimentacao(posicaoAtual, posicaoAtual))
      setJustificativa('')
      setServerError(null)
    }
  }

  function handlePosicaoChange(value: string) {
    const parsed = Number.parseInt(value, 10)
    setPosicaoNova(value)
    if (Number.isFinite(parsed) && parsed >= 1) {
      setTipoMovimentacao(inferTipoMovimentacao(posicaoAtual, parsed))
    }
  }

  function handleConfirm() {
    const parsedPosicao = Number.parseInt(posicaoNova, 10)
    const justificativaTrim = justificativa.trim()

    if (!Number.isFinite(parsedPosicao) || parsedPosicao < 1) {
      setServerError('Informe uma posição válida (número inteiro ≥ 1).')
      return
    }

    if (parsedPosicao === posicaoAtual) {
      setServerError('A nova posição deve ser diferente da posição atual.')
      return
    }

    if (justificativaTrim.length < MIN_JUSTIFICATIVA_FILA_CHARS) {
      setServerError(
        `A justificativa deve ter pelo menos ${MIN_JUSTIFICATIVA_FILA_CHARS} caracteres.`
      )
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await moverPacienteNaFila({
        solicitacaoId,
        posicaoNova: parsedPosicao,
        tipoMovimentacao,
        justificativa: justificativaTrim,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível alterar a posição na fila.')
        return
      }

      handleOpenChange(false)
      setJustificativa('')
      router.refresh()
    })
  }

  return (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.MOVER_FILA}>
      {hideTrigger ? null : (
        <Button
          type="button"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation()
            handleOpenChange(true)
          }}
        >
          Mover na fila
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent titulo="Mover na fila">
          <div className="flex flex-col gap-[var(--space-4)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Alterar a posição da solicitação{' '}
              <strong className="text-[var(--color-text)]">{protocolo}</strong> na fila de
              regulação. Posição atual: <strong>#{posicaoAtual}</strong>
            </p>

            <Input
              id="mover-fila-posicao"
              label="Nova posição"
              type="number"
              min={1}
              step={1}
              value={posicaoNova}
              onChange={(event) => handlePosicaoChange(event.target.value)}
              disabled={isPending}
              required
            />

            <Select
              id="mover-fila-tipo"
              label="Tipo de movimentação"
              options={[...TIPO_OPTIONS]}
              value={tipoMovimentacao}
              onValueChange={(value) => setTipoMovimentacao(value as TipoMovimentacao)}
              disabled={isPending}
            />

            <Textarea
              id="mover-fila-justificativa"
              label="Justificativa"
              value={justificativa}
              onChange={(event) => setJustificativa(event.target.value)}
              disabled={isPending}
              rows={4}
              hint={`Mínimo de ${MIN_JUSTIFICATIVA_FILA_CHARS} caracteres.`}
              required
            />

            {serverError ? (
              <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
                {serverError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={handleConfirm} loading={isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  )
}
