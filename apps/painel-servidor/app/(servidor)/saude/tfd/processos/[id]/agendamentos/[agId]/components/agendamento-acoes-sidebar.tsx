'use client'

import {
  cancelarAgendamento,
  registrarRetornoAgendamento,
} from '@saude/mod-saude-tfd/actions/agendamento'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { ViagemPorAgendamentoItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const MIN_MOTIVO = 20

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface AgendamentoAcoesSidebarProps {
  session: SaudeMunicSession
  agendamentoId: string
  status: string
  viagensVinculadas: ViagemPorAgendamentoItem[]
}

export function AgendamentoAcoesSidebar({
  session,
  agendamentoId,
  status,
  viagensVinculadas,
}: AgendamentoAcoesSidebarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  const podeRegistrarRetorno = status === 'AGENDADO' || status === 'EM_VIAGEM'
  const podeCancelar = status === 'AGENDADO'
  const semAcoes = status === 'REALIZADO' || status === 'CANCELADO'

  const viagensConcluidas = viagensVinculadas.filter((viagem) => viagem.status === 'CONCLUIDA')

  function handleRegistrarRetorno() {
    setServerError(null)
    setSucesso(null)

    startTransition(async () => {
      const result = await registrarRetornoAgendamento({ agendamentoId })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar o retorno.')
        return
      }

      setSucesso('Retorno registrado. A prestação de contas foi aberta com prazo de envio.')
      router.refresh()
    })
  }

  function handleCancelar() {
    const motivo = motivoCancelamento.trim()
    if (motivo.length < MIN_MOTIVO) {
      setServerError(`O motivo deve ter pelo menos ${MIN_MOTIVO} caracteres.`)
      return
    }

    setServerError(null)

    startTransition(async () => {
      const result = await cancelarAgendamento({
        agendamentoId,
        motivoCancelamento: motivo,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível cancelar o agendamento.')
        return
      }

      setCancelOpen(false)
      setMotivoCancelamento('')
      router.refresh()
    })
  }

  return (
    <Card header={<CardHeader>Ações</CardHeader>} className="lg:sticky lg:top-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-3)]">
        {viagensConcluidas.length > 0 ? (
          <div className="flex flex-col gap-[var(--space-2)] border-b border-[var(--color-border)] pb-[var(--space-3)]">
            {viagensConcluidas.map((viagem) => (
              <Link
                key={`${viagem.id}-${viagem.tipoTrecho}`}
                href={`/saude/tfd/viagens/${viagem.id}?tab=prestacao`}
                className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
              >
                Ver prestação de contas → {viagem.protocolo}
              </Link>
            ))}
          </div>
        ) : null}

        {semAcoes ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Nenhuma ação disponível para este agendamento.
          </p>
        ) : null}

        {podeRegistrarRetorno ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_RETORNO}>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={isPending}
              onClick={handleRegistrarRetorno}
            >
              {isPending ? (
                <>
                  <Spinner className="mr-[var(--space-2)] size-4" />
                  Registrando…
                </>
              ) : (
                'Registrar retorno'
              )}
            </Button>
          </PermissionGate>
        ) : null}

        {podeCancelar ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.CANCELAR_PROCESSO}>
            <Button
              type="button"
              variant="danger"
              className="w-full"
              disabled={isPending}
              onClick={() => {
                setServerError(null)
                setCancelOpen(true)
              }}
            >
              Cancelar agendamento
            </Button>
          </PermissionGate>
        ) : null}

        {sucesso ? <Alert variant="success">{sucesso}</Alert> : null}
        {serverError ? <ServerError message={serverError} /> : null}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent titulo="Cancelar agendamento">
          <Textarea
            label="Motivo do cancelamento"
            value={motivoCancelamento}
            onChange={(event) => setMotivoCancelamento(event.target.value)}
            rows={4}
            disabled={isPending}
            hint={`Mínimo de ${MIN_MOTIVO} caracteres.`}
          />
          {serverError ? <ServerError message={serverError} /> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={isPending}
            >
              Voltar
            </Button>
            <PermissionGate session={session} permission={TFD_PERMISSIONS.CANCELAR_PROCESSO}>
              <Button
                type="button"
                variant="danger"
                disabled={isPending}
                onClick={handleCancelar}
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-[var(--space-2)] size-4" />
                    Cancelando…
                  </>
                ) : (
                  'Confirmar cancelamento'
                )}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
