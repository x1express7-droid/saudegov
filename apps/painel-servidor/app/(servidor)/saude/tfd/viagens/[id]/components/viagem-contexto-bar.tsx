'use client'

import {
  cancelarViagem,
  mudarStatusViagem,
  registrarChegadaViagem,
} from '@saude/mod-saude-tfd/actions/viagem-nova'
import type { ViagemDetalheOutput, ViagemFinanceiroPcOutput } from '@saude/mod-saude-tfd/client'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { ViagemStatusBadge } from '../../../components/viagem-status-badge'
import {
  Button,
  Card,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  formatDateOnlyBr,
  Input,
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Bus, ClipboardCheck, FileText, Users, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export type ViagemDetalheTabId =
  | 'detalhes'
  | 'passageiros'
  | 'financeiro'
  | 'prestacao'
  | 'historico'

const MIN_MOTIVO = 20

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-error)]" role="alert">
      {message}
    </p>
  )
}

export interface ViagemContextoBarProps {
  session: SaudeMunicSession
  viagem: ViagemDetalheOutput
  financeiro: ViagemFinanceiroPcOutput | null
  onNavigateTab: (tab: ViagemDetalheTabId) => void
}

export function ViagemContextoBar({
  session,
  viagem,
  financeiro,
  onNavigateTab,
}: ViagemContextoBarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [chegadaOpen, setChegadaOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [kmChegada, setKmChegada] = useState('')
  const [dataChegada, setDataChegada] = useState('')
  const [horaChegada, setHoraChegada] = useState('')
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  const statusFinal = viagem.status === 'CONCLUIDA' || viagem.status === 'CANCELADA'
  const totalEstimado = financeiro?.totais.estimadoSolicitacoes ?? 0

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
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar a chegada.')
        return
      }

      setChegadaOpen(false)
      onNavigateTab('financeiro')
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
    <>
      <div className="grid gap-[var(--space-4)] md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
        <Card
          header={
            <CardHeader className="flex flex-wrap items-center gap-[var(--space-2)]">
              <Bus className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              Resumo da viagem
            </CardHeader>
          }
          bodyClassName="py-[var(--space-3)] px-[var(--space-4)]"
        >
          <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
            <dl className="grid min-w-0 flex-1 gap-x-[var(--space-6)] gap-y-[var(--space-2)] sm:grid-cols-3">
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Status
                </dt>
                <dd className="mt-0.5">
                  <ViagemStatusBadge status={viagem.status} />
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Passageiros
                </dt>
                <dd className="mt-0.5 flex items-center gap-1 text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                  <Users className="size-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
                  {viagem.passageiros.length}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Saída
                </dt>
                <dd className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {formatDateOnlyBr(viagem.dataSaida)}
                  {viagem.horaSaida ? ` · ${viagem.horaSaida}` : ''}
                </dd>
              </div>
            </dl>
            {totalEstimado > 0 ? (
              <p className="shrink-0 font-mono text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-success)]">
                Estimado: {currencyFormatter.format(totalEstimado)}
              </p>
            ) : null}
          </div>
        </Card>

        <Card
          header={
            <CardHeader className="flex items-center gap-[var(--space-2)]">
              <FileText className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              Ações rápidas
            </CardHeader>
          }
          bodyClassName="py-[var(--space-3)] px-[var(--space-4)]"
        >
          <div className="flex flex-col gap-[var(--space-2)]">
            {serverError ? <ServerError message={serverError} /> : null}

            <button
              type="button"
              className="flex items-center gap-[var(--space-2)] text-left text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
              onClick={() => onNavigateTab('passageiros')}
            >
              <Users className="size-4 shrink-0" aria-hidden="true" />
              Passageiros ({viagem.passageiros.length})
            </button>
            <button
              type="button"
              className="flex items-center gap-[var(--space-2)] text-left text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
              onClick={() => onNavigateTab('financeiro')}
            >
              <Wallet className="size-4 shrink-0" aria-hidden="true" />
              Financeiro
            </button>
            {viagem.status === 'CONCLUIDA' ? (
              <button
                type="button"
                className="flex items-center gap-[var(--space-2)] text-left text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
                onClick={() => onNavigateTab('prestacao')}
              >
                <ClipboardCheck className="size-4 shrink-0" aria-hidden="true" />
                Prestação de contas
              </button>
            ) : null}

            {!statusFinal ? (
              <div className="mt-[var(--space-2)] flex flex-col gap-[var(--space-2)] border-t border-[var(--color-border)] pt-[var(--space-2)]">
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
            ) : null}
          </div>
        </Card>
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
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              A prestação de contas será aberta automaticamente. Os custos da solicitação poderão
              ser importados na aba Financeiro.
            </p>
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
    </>
  )
}
