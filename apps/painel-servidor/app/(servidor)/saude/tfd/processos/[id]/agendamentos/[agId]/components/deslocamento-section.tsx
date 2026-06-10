'use client'

import { vincularAgendamentoNaViagem } from '@saude/mod-saude-tfd/actions/viagem-nova'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { ViagemPorAgendamentoItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  formatDateOnlyBr,
  ProtocoloBadge,
  Select,
  Spinner,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { ArrowRight, Link2, Route } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition, type ReactNode } from 'react'

import { ViagemStatusBadge } from '../../../../../components/viagem-status-badge'
import {
  buscarViagensParaVincularAgendamentoAction,
  type ViagemParaVincularItem,
} from '../actions'

export interface DeslocamentoSectionProps {
  session: SaudeMunicSession
  agendamentoId: string
  dataConsulta: string
  viagensVinculadas: ViagemPorAgendamentoItem[]
}

const TIPO_TRECHO_LABEL: Record<string, string> = {
  IDA: 'Ida',
  VOLTA: 'Volta',
  IDA_VOLTA: 'Ida e volta',
}

const TIPO_TRECHO_OPTIONS = [
  { value: 'IDA', label: 'Ida' },
  { value: 'VOLTA', label: 'Volta' },
  { value: 'IDA_VOLTA', label: 'Ida e volta' },
] as const

function labelTipoTrecho(tipo: string): string {
  return TIPO_TRECHO_LABEL[tipo] ?? tipo
}


function formatVagasLabel(viagem: ViagemParaVincularItem): string {
  if (viagem.capacidadeVeiculo === null) {
    return `${viagem.vagasOcupadas} passageiro(s) — veículo sem capacidade definida`
  }
  const disponiveis = viagem.vagasDisponiveis ?? 0
  return `${disponiveis} vaga(s) livre(s) de ${viagem.capacidadeVeiculo}`
}

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-error)]" role="alert">
      {message}
    </p>
  )
}

function ViagemVinculadaCard({ viagem }: { viagem: ViagemPorAgendamentoItem }) {
  return (
    <article className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          <Link
            href={`/saude/tfd/viagens/${viagem.id}`}
            className="hover:opacity-90"
          >
            <ProtocoloBadge protocolo={viagem.protocolo} />
          </Link>
          <ViagemStatusBadge status={viagem.status} size="sm" />
        </div>
        <Badge variant="gray" size="sm">
          Trecho: {labelTipoTrecho(viagem.tipoTrecho)}
        </Badge>
      </div>

      <dl className="grid gap-[var(--space-2)] sm:grid-cols-2">
        <div>
          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Data de saída
          </dt>
          <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            {formatDateOnlyBr(viagem.dataSaida)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Rota</dt>
          <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            {viagem.origemDescricao}
            <ArrowRight className="mx-1 inline size-4 align-text-bottom text-[var(--color-text-muted)]" />
            {viagem.destinoDescricao}
          </dd>
        </div>
      </dl>

      <Link
        href={`/saude/tfd/viagens/${viagem.id}`}
        className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
      >
        Ver viagem →
      </Link>
    </article>
  )
}

function CaminhoDeslocamentoCard({
  icon,
  titulo,
  descricao,
  children,
}: {
  icon: React.ReactNode
  titulo: string
  descricao: string
  children: ReactNode
}) {
  return (
    <article className="flex flex-1 flex-col gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-5)]">
      <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] text-[var(--color-primary)]">
        {icon}
      </div>
      <div className="flex flex-col gap-[var(--space-2)]">
        <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          {titulo}
        </h3>
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">{descricao}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </article>
  )
}

function ViagemSelecaoItem({
  viagem,
  selecionada,
  onSelect,
}: {
  viagem: ViagemParaVincularItem
  selecionada: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[var(--radius-md)] border p-[var(--space-4)] text-left transition-colors ${
        selecionada
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
          : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
        <ProtocoloBadge protocolo={viagem.protocolo} />
        <ViagemStatusBadge status={viagem.status} size="sm" />
      </div>
      <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]">
        Saída: {formatDateOnlyBr(viagem.dataSaida)}
      </p>
      <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text)]">
        {viagem.origemDescricao}
        <ArrowRight className="mx-1 inline size-4 align-text-bottom text-[var(--color-text-muted)]" />
        {viagem.destinoDescricao}
      </p>
      <p className="mt-[var(--space-2)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
        {formatVagasLabel(viagem)}
      </p>
    </button>
  )
}

export function DeslocamentoSection({
  session,
  agendamentoId,
  dataConsulta,
  viagensVinculadas,
}: DeslocamentoSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [vincularOpen, setVincularOpen] = useState(false)
  const [viagensDisponiveis, setViagensDisponiveis] = useState<ViagemParaVincularItem[]>([])
  const [loadingViagens, setLoadingViagens] = useState(false)
  const [viagemSelecionadaId, setViagemSelecionadaId] = useState('')
  const [tipoTrecho, setTipoTrecho] = useState('IDA')

  const novaViagemHref = `/saude/tfd/viagens/nova?agendamentoId=${encodeURIComponent(agendamentoId)}`

  const viagemIdsJaVinculadas = useMemo(
    () => [...new Set(viagensVinculadas.map((v) => v.id))],
    [viagensVinculadas]
  )

  async function abrirDialogVincular() {
    setServerError(null)
    setVincularOpen(true)
    setLoadingViagens(true)
    setViagemSelecionadaId('')
    setTipoTrecho('IDA')

    const items = await buscarViagensParaVincularAgendamentoAction(
      dataConsulta,
      viagemIdsJaVinculadas
    )
    setViagensDisponiveis(items)
    setLoadingViagens(false)
  }

  function handleVincular() {
    if (!viagemSelecionadaId) {
      setServerError('Selecione uma viagem.')
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await vincularAgendamentoNaViagem({
        viagemId: viagemSelecionadaId,
        agendamentoId,
        tipoTrecho: tipoTrecho as 'IDA' | 'VOLTA' | 'IDA_VOLTA',
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível vincular o agendamento.')
        return
      }

      setVincularOpen(false)
      router.refresh()
    })
  }

  return (
    <Card header={<CardHeader className="border-0 p-0">Deslocamento</CardHeader>}>
      {viagensVinculadas.length === 0 ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Escolha como organizar o deslocamento deste agendamento:
          </p>
          <div className="grid gap-[var(--space-4)] md:grid-cols-2">
            {/* BLOCO-1: descrição do card de nova viagem */}
            <CaminhoDeslocamentoCard
              icon={<Route className="size-5" aria-hidden="true" />}
              titulo="Criar nova viagem"
              descricao="Organize o transporte para este agendamento: veículo, motorista e outros pacientes na mesma rota."
            >
              <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
                <Button asChild variant="primary" className="w-full sm:w-auto">
                  <Link href={novaViagemHref}>Criar viagem</Link>
                </Button>
              </PermissionGate>
            </CaminhoDeslocamentoCard>

            {/* BLOCO-1: descrição do card de vínculo */}
            <CaminhoDeslocamentoCard
              icon={<Link2 className="size-5" aria-hidden="true" />}
              titulo="Vincular à viagem existente"
              descricao="Este agendamento será adicionado como passageiro de uma viagem já planejada para a mesma data e rota."
            >
              <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => void abrirDialogVincular()}
                >
                  Selecionar viagem
                </Button>
              </PermissionGate>
            </CaminhoDeslocamentoCard>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-[var(--space-4)]">
          {viagensVinculadas.map((viagem) => (
            <li key={`${viagem.id}-${viagem.tipoTrecho}`}>
              <ViagemVinculadaCard viagem={viagem} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={vincularOpen} onOpenChange={setVincularOpen}>
        <DialogContent titulo="Vincular à viagem existente">
          {serverError ? <ServerError message={serverError} /> : null}

          {loadingViagens ? (
            <div className="flex items-center gap-[var(--space-2)] text-[var(--color-text-muted)]">
              <Spinner className="size-4" />
              Carregando viagens...
            </div>
          ) : viagensDisponiveis.length === 0 ? (
            <EmptyState
              titulo="Nenhuma viagem planejada"
              descricao="Nenhuma viagem planejada para este processo. Crie uma nova viagem."
            />
          ) : (
            <div className="flex flex-col gap-[var(--space-4)]">
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Selecione a viagem e o tipo de trecho para este agendamento.
              </p>
              <ul className="flex max-h-[min(320px,50vh)] flex-col gap-[var(--space-3)] overflow-y-auto">
                {viagensDisponiveis.map((viagem) => (
                  <li key={viagem.id}>
                    <ViagemSelecaoItem
                      viagem={viagem}
                      selecionada={viagemSelecionadaId === viagem.id}
                      onSelect={() => setViagemSelecionadaId(viagem.id)}
                    />
                  </li>
                ))}
              </ul>
              <Select
                id="vincular-viagem-tipo-trecho"
                label="Tipo de trecho"
                value={tipoTrecho}
                options={[...TIPO_TRECHO_OPTIONS]}
                onValueChange={setTipoTrecho}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => setVincularOpen(false)}
            >
              Cancelar
            </Button>
            {viagensDisponiveis.length > 0 ? (
              <Button
                type="button"
                variant="primary"
                disabled={isPending || !viagemSelecionadaId}
                onClick={handleVincular}
              >
                {isPending ? 'Vinculando...' : 'Vincular'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
