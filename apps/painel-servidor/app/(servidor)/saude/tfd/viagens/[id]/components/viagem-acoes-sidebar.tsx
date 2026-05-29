'use client'

import {
  cancelarViagem,
  mudarStatusViagem,
  registrarChegadaViagem,
} from '@saude/mod-saude-tfd/actions/viagem-nova'
import type { ViagemDetalheOutput } from '@saude/mod-saude-tfd/client'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Button,
  Card,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const MIN_MOTIVO = 20

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-error)]" role="alert">
      {message}
    </p>
  )
}

export interface ViagemAcoesSidebarProps {
  session: SaudeMunicSession
  viagem: ViagemDetalheOutput
}

export function ViagemAcoesSidebar({ session, viagem }: ViagemAcoesSidebarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [chegadaOpen, setChegadaOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [kmChegada, setKmChegada] = useState('')
  const [dataChegada, setDataChegada] = useState('')
  const [horaChegada, setHoraChegada] = useState('')
  const [custoReal, setCustoReal] = useState('')
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  const statusFinal = viagem.status === 'CONCLUIDA' || viagem.status === 'CANCELADA'

  function handleMudarStatus(novoStatus: 'CONFIRMADA' | 'EM_ANDAMENTO') {
    setServerError(null)
    startTransition(async () => {
      const result = await mudarStatusViagem({ viagemId: viagem.id, novoStatus })
      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível alterar o status.')
        return
      }
      router.refresh()
    })
  }

  function handleRegistrarChegada() {
    setServerError(null)
    startTransition(async () => {
      const result = await registrarChegadaViagem({
        viagemId: viagem.id,
        kmChegada: kmChegada ? Number.parseInt(kmChegada, 10) : undefined,
        dataChegada: dataChegada || undefined,
        horaChegada: horaChegada || undefined,
        custoReal: custoReal ? Number.parseFloat(custoReal.replace(',', '.')) : undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar a chegada.')
        return
      }

      setChegadaOpen(false)
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
      const result = await cancelarViagem({ viagemId: viagem.id, motivo })
      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível cancelar a viagem.')
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
        {serverError ? <ServerError message={serverError} /> : null}

        {statusFinal ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {viagem.status === 'CONCLUIDA'
              ? 'Viagem concluída. Nenhuma ação pendente.'
              : 'Viagem cancelada. Nenhuma ação disponível.'}
          </p>
        ) : null}

        {viagem.status === 'PLANEJADA' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={isPending}
              onClick={() => handleMudarStatus('CONFIRMADA')}
            >
              Confirmar viagem
            </Button>
          </PermissionGate>
        ) : null}

        {viagem.status === 'CONFIRMADA' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={isPending}
              onClick={() => handleMudarStatus('EM_ANDAMENTO')}
            >
              Iniciar viagem
            </Button>
          </PermissionGate>
        ) : null}

        {viagem.status === 'EM_ANDAMENTO' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={isPending}
              onClick={() => setChegadaOpen(true)}
            >
              Registrar chegada
            </Button>
          </PermissionGate>
        ) : null}

        {viagem.status === 'PLANEJADA' || viagem.status === 'CONFIRMADA' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
            <Button
              type="button"
              variant="danger"
              className="w-full"
              disabled={isPending}
              onClick={() => setCancelOpen(true)}
            >
              Cancelar viagem
            </Button>
          </PermissionGate>
        ) : null}
      </div>

      <Dialog open={chegadaOpen} onOpenChange={setChegadaOpen}>
        <DialogContent titulo="Registrar chegada">
          <div className="flex flex-col gap-[var(--space-4)]">
            <Input
              id="chegada-km"
              label="Quilometragem de chegada"
              type="number"
              min={1}
              value={kmChegada}
              onChange={(event) => setKmChegada(event.target.value)}
            />
            <Input
              id="chegada-data"
              label="Data de chegada"
              type="date"
              value={dataChegada}
              onChange={(event) => setDataChegada(event.target.value)}
            />
            <Input
              id="chegada-hora"
              label="Hora de chegada"
              type="time"
              value={horaChegada}
              onChange={(event) => setHoraChegada(event.target.value)}
            />
            <Input
              id="chegada-custo"
              label="Custo real (R$)"
              inputMode="decimal"
              value={custoReal}
              onChange={(event) => setCustoReal(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setChegadaOpen(false)}>
              Voltar
            </Button>
            <Button type="button" variant="primary" disabled={isPending} onClick={handleRegistrarChegada}>
              {isPending ? <Spinner className="size-4" /> : 'Confirmar chegada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent titulo="Cancelar viagem">
          <Textarea
            id="cancelar-motivo"
            label="Motivo do cancelamento"
            value={motivoCancelamento}
            onChange={(event) => setMotivoCancelamento(event.target.value)}
            rows={4}
            hint={`Mínimo de ${MIN_MOTIVO} caracteres.`}
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button type="button" variant="danger" disabled={isPending} onClick={handleCancelar}>
              {isPending ? <Spinner className="size-4" /> : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
