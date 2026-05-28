'use client'

import { reclassificarSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/solicitacao'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  cn,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

type UrgenciaReclassificacao = 'BAIXA' | 'INTERMEDIARIA' | 'GRAVE'

const OPCOES: Array<{
  value: UrgenciaReclassificacao
  label: string
  description: string
  borderClass: string
  selectedClass: string
}> = [
  {
    value: 'BAIXA',
    label: 'Não aguda / Baixa',
    description: 'Prioridade padrão na fila de regulação.',
    borderClass: 'border-[var(--color-success)]',
    selectedClass: 'bg-[var(--color-success-light)] ring-2 ring-[var(--color-success)]',
  },
  {
    value: 'INTERMEDIARIA',
    label: 'Intermediária',
    description: 'Atenção moderada na análise e na fila.',
    borderClass: 'border-[var(--color-warning)]',
    selectedClass: 'bg-[var(--color-warning-light)] ring-2 ring-[var(--color-warning)]',
  },
  {
    value: 'GRAVE',
    label: 'Alta',
    description: 'Alta prioridade clínica (urgência alta).',
    borderClass: 'border-[var(--color-danger)]',
    selectedClass: 'bg-[var(--color-danger-light)] ring-2 ring-[var(--color-danger)]',
  },
]

function mapUrgenciaInicial(urgencia: string): UrgenciaReclassificacao | null {
  if (urgencia === 'BAIXA' || urgencia === 'INTERMEDIARIA' || urgencia === 'GRAVE') {
    return urgencia
  }
  return null
}

export interface ReclassificarDialogProps {
  session: SaudeMunicSession
  solicitacaoId: string
  urgenciaAtual: string
}

export function ReclassificarDialog({
  session,
  solicitacaoId,
  urgenciaAtual,
}: ReclassificarDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selecionada, setSelecionada] = useState<UrgenciaReclassificacao | null>(
    mapUrgenciaInicial(urgenciaAtual)
  )
  const [confirmarRebaixamento, setConfirmarRebaixamento] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isMuitoUrgente = urgenciaAtual === 'MUITO_URGENTE'

  useEffect(() => {
    if (open) {
      setSelecionada(mapUrgenciaInicial(urgenciaAtual))
      setConfirmarRebaixamento(false)
      setServerError(null)
    }
  }, [open, urgenciaAtual])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setServerError(null)
      setConfirmarRebaixamento(false)
    }
  }

  function handleSalvar() {
    if (!selecionada) {
      setServerError('Selecione uma classificação de risco.')
      return
    }

    if (isMuitoUrgente && !confirmarRebaixamento) {
      setServerError('Confirme o rebaixamento da urgência para continuar.')
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await reclassificarSolicitacaoTfd({
        solicitacaoId,
        novaUrgencia: selecionada,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível reclassificar a urgência.')
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.DECIDIR_SOLICITACAO}>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        Reclassificar
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent titulo="Classificação de risco">
          <div className="flex flex-col gap-[var(--space-4)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Ajuste a urgência da solicitação para regulação da fila. Esta ação é registrada na
              tramitação do processo.
            </p>

            {isMuitoUrgente ? (
              <Alert variant="warning" role="status">
                Esta solicitação tem urgência Muito Urgente. Reclassificar irá rebaixá-la.
              </Alert>
            ) : null}

            <div
              className="grid gap-[var(--space-3)] sm:grid-cols-1"
              role="radiogroup"
              aria-label="Classificação de risco"
            >
              {OPCOES.map((opcao) => {
                const selected = selecionada === opcao.value
                return (
                  <button
                    key={opcao.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isPending}
                    onClick={() => setSelecionada(opcao.value)}
                    className={cn(
                      'flex flex-col gap-[var(--space-1)] rounded-[var(--radius-md)] border p-[var(--space-4)] text-left transition-colors',
                      opcao.borderClass,
                      selected ? opcao.selectedClass : 'bg-[var(--color-bg)] hover:bg-[var(--color-bg-subtle)]'
                    )}
                  >
                    <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
                      {opcao.label}
                    </span>
                    <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      {opcao.description}
                    </span>
                  </button>
                )
              })}
            </div>

            {isMuitoUrgente ? (
              <label className="flex cursor-pointer items-start gap-[var(--space-2)]">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--color-primary)]"
                  checked={confirmarRebaixamento}
                  onChange={(event) => setConfirmarRebaixamento(event.target.checked)}
                  disabled={isPending}
                />
                <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  Confirmo o rebaixamento da urgência desta solicitação.
                </span>
              </label>
            ) : null}

            {serverError ? (
              <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-danger)]">
                {serverError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={handleSalvar} loading={isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  )
}
