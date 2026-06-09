'use client'

import type { PrestacaoDetalheViagemNovaOutput } from '@saude/mod-saude-tfd'
import {
  desvincularPassageiro,
  vincularAgendamentoNaViagem,
} from '@saude/mod-saude-tfd/actions/viagem-nova'
import type {
  AgendamentoDisponivelViagemItem,
  ViagemDetalheOutput,
} from '@saude/mod-saude-tfd/client'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Combobox,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  Select,
  Spinner,
  TramitacaoTimeline,
  type TramitacaoItem,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { ViagemOcupacaoPanel } from '../../components/viagem-ocupacao-panel'
import { buscarAgendamentosDisponiveisViagemDetalheAction } from '../actions'
import { PrestacaoViagemView } from './prestacao-viagem-view'
import { ViagemAcoesSidebar } from './viagem-acoes-sidebar'
import { SegmentosViagemSection } from './segmentos-viagem-section'

const TABS = [
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'passageiros', label: 'Passageiros' },
  { id: 'historico', label: 'Histórico' },
  { id: 'prestacao', label: 'Prestação de Contas' },
] as const

type TabId = (typeof TABS)[number]['id']

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

function formatDataHora(data: string | null, hora: string | null): string {
  if (!data) {
    return '—'
  }
  return hora ? `${data} ${hora}` : data
}

function cnhStatusBadge(validade: string) {
  const vencimento = new Date(`${validade}T12:00:00`)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite = new Date(hoje)
  limite.setDate(limite.getDate() + 30)

  if (vencimento < hoje) {
    return <Badge variant="red">VENCIDA</Badge>
  }
  if (vencimento <= limite) {
    return <Badge variant="yellow">VENCENDO</Badge>
  }
  return <Badge variant="green">VÁLIDA</Badge>
}

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-error)]" role="alert">
      {message}
    </p>
  )
}

export interface ViagemDetalheViewProps {
  session: SaudeMunicSession
  viagem: ViagemDetalheOutput
  prestacao: PrestacaoDetalheViagemNovaOutput | null
  valorReservaSaldo?: number | null
  initialTab?: TabId
}

export function ViagemDetalheView({
  session,
  viagem,
  prestacao,
  valorReservaSaldo = null,
  initialTab,
}: ViagemDetalheViewProps) {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>(initialTab ?? 'detalhes')
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [vincularOpen, setVincularOpen] = useState(false)
  const [agendamentosDisponiveis, setAgendamentosDisponiveis] = useState<
    AgendamentoDisponivelViagemItem[]
  >([])
  const [loadingDisponiveis, setLoadingDisponiveis] = useState(false)
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState('')
  const [tipoTrecho, setTipoTrecho] = useState('IDA')

  const podeDesvincular =
    viagem.status === 'PLANEJADA' || viagem.status === 'CONFIRMADA'

  const vagasOcupadas = useMemo(
    () =>
      viagem.passageiros.reduce(
        (total, passageiro) => total + 1 + passageiro.acompanhantesCount,
        0
      ),
    [viagem.passageiros]
  )

  const capacidade = viagem.veiculo?.capacidadePassageiros ?? null

  const tramitacoes = useMemo<TramitacaoItem[]>(
    () =>
      viagem.tramitacoes.map((item, index) => ({
        id: `${item.id}-${index}`,
        tipo: item.tipo,
        descricao: item.descricao,
        autor: { nome: item.usuarioNome ?? 'Sistema' },
        criadoAt: new Date(item.createdAt),
      })),
    [viagem.tramitacoes]
  )

  const agendamentoOptions = agendamentosDisponiveis.map((item) => ({
    value: item.id,
    label: `${item.paciente.nome} — ${item.dataConsulta} (${item.tipoAtendimento})`,
  }))

  async function abrirVincularDialog() {
    setServerError(null)
    setVincularOpen(true)
    setLoadingDisponiveis(true)
    setAgendamentoSelecionado('')
    setTipoTrecho('IDA')

    const items = await buscarAgendamentosDisponiveisViagemDetalheAction(
      viagem.id,
      viagem.dataSaida,
      viagem.destinoDescricao
    )
    setAgendamentosDisponiveis(items)
    setLoadingDisponiveis(false)
  }

  function handleVincular() {
    if (!agendamentoSelecionado) {
      setServerError('Selecione um agendamento.')
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await vincularAgendamentoNaViagem({
        viagemId: viagem.id,
        agendamentoId: agendamentoSelecionado,
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

  function handleDesvincular(agendamentoId: string) {
    setServerError(null)
    startTransition(async () => {
      const result = await desvincularPassageiro({ viagemId: viagem.id, agendamentoId })
      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível desvincular o passageiro.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
        <div
          className="flex flex-wrap gap-[var(--space-1)] border-b border-[var(--color-border)]"
          role="tablist"
          aria-label="Seções da viagem TFD"
        >
          {TABS.map((item) => {
            const selected = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={[
                  'rounded-t-[var(--radius)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium transition-colors',
                  selected
                    ? 'border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                ].join(' ')}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {serverError && tab !== 'detalhes' ? <ServerError message={serverError} /> : null}

        {tab === 'detalhes' ? (
          <div className="flex flex-col gap-[var(--space-6)]">
            {/* BLOCO-3: segmentos como primeira seção na aba Detalhes */}
            <SegmentosViagemSection
              session={session}
              viagemId={viagem.id}
              viagemProtocolo={viagem.protocolo}
              viagemStatus={viagem.status}
              segmentos={viagem.segmentos}
            />

            <Card header={<CardHeader>Rota e deslocamento</CardHeader>}>
              <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    Origem
                  </dt>
                  <dd className="mt-1 text-[var(--color-text)]">{viagem.origemDescricao}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    Destino
                  </dt>
                  <dd className="mt-1 text-[var(--color-text)]">{viagem.destinoDescricao}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    Saída
                  </dt>
                  <dd className="mt-1">{formatDataHora(viagem.dataSaida, viagem.horaSaida)}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    Chegada
                  </dt>
                  <dd className="mt-1">
                    {formatDataHora(viagem.dataChegada, viagem.horaChegada)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    KM saída
                  </dt>
                  <dd className="mt-1">{viagem.kmSaida ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    KM chegada
                  </dt>
                  <dd className="mt-1">{viagem.kmChegada ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    Tempo estimado
                  </dt>
                  <dd className="mt-1">
                    {viagem.tempoEstimadoMin ? `${viagem.tempoEstimadoMin} min` : '—'}
                  </dd>
                </div>
                {/* BLOCO-4: custos removidos da aba Detalhes — exibidos na Prestação de Contas */}
              </dl>
            </Card>

            <Card header={<CardHeader>Veículo e motorista</CardHeader>}>
              <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    Veículo
                  </dt>
                  <dd className="mt-1">
                    {viagem.veiculo
                      ? `${viagem.veiculo.placa} — ${viagem.veiculo.modelo} (${viagem.veiculo.capacidadePassageiros} lugares)`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    Motorista
                  </dt>
                  <dd className="mt-1">{viagem.motorista?.userNome ?? '—'}</dd>
                </div>
                {viagem.motorista ? (
                  <>
                    <div>
                      <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                        CNH
                      </dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-[var(--space-2)]">
                        <span>
                          {viagem.motorista.cnh} ({viagem.motorista.cnhCategoria})
                        </span>
                        {cnhStatusBadge(viagem.motorista.cnhValidade)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                        Validade CNH
                      </dt>
                      <dd className="mt-1">{viagem.motorista.cnhValidade}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </Card>
          </div>
        ) : null}

        {tab === 'passageiros' ? (
          <div className="flex flex-col gap-[var(--space-4)]">
            <ViagemOcupacaoPanel ocupadas={vagasOcupadas} capacidade={capacidade} />

            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
              <Button type="button" variant="secondary" onClick={() => void abrirVincularDialog()}>
                Vincular agendamento
              </Button>
            </PermissionGate>

            {viagem.passageiros.length === 0 ? (
              <EmptyState
                titulo="Nenhum passageiro vinculado"
                descricao="Para adicionar passageiros, vá ao agendamento do processo e clique em 'Vincular à viagem existente', ou use o botão abaixo para buscar agendamentos disponíveis."
              />
            ) : (
              <ul className="flex flex-col gap-[var(--space-3)]">
                {viagem.passageiros.map((passageiro) => (
                  <li
                    key={passageiro.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
                      <div>
                        <p className="font-medium text-[var(--color-text)]">
                          {passageiro.agendamento.paciente.nome}
                        </p>
                        <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                          Consulta: {passageiro.agendamento.dataConsulta} ·{' '}
                          {passageiro.acompanhantesCount} acompanhante(s) · Presença:{' '}
                          {passageiro.statusPresenca}
                        </p>
                        <div className="mt-2">
                          <Badge variant="blue" size="sm">
                            {TIPO_TRECHO_LABEL[passageiro.tipoTrecho] ?? passageiro.tipoTrecho}
                          </Badge>
                        </div>
                      </div>
                      {podeDesvincular ? (
                        <PermissionGate
                          session={session}
                          permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleDesvincular(passageiro.agendamentoId)}
                          >
                            Desvincular
                          </Button>
                        </PermissionGate>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === 'historico' ? (
          <Card header={<CardHeader>Tramitações do processo</CardHeader>}>
            <TramitacaoTimeline tramitacoes={tramitacoes} />
          </Card>
        ) : null}

        {tab === 'prestacao' ? (
          <PrestacaoViagemView
            session={session}
            viagemNovaId={viagem.id}
            viagemProtocolo={viagem.protocolo}
            viagemStatus={viagem.status}
            dataChegadaViagem={viagem.dataChegada}
            valorReservaSaldo={valorReservaSaldo}
            segmentos={viagem.segmentos}
            prestacao={prestacao}
          />
        ) : null}
      </div>

      <ViagemAcoesSidebar session={session} viagem={viagem} />

      <Dialog open={vincularOpen} onOpenChange={setVincularOpen}>
        <DialogContent titulo="Vincular agendamento">
          {loadingDisponiveis ? (
            <div className="flex items-center gap-[var(--space-2)] text-[var(--color-text-muted)]">
              <Spinner className="size-4" />
              Carregando agendamentos...
            </div>
          ) : agendamentosDisponiveis.length === 0 ? (
            <EmptyState
              titulo="Nenhum agendamento disponível"
              descricao="Não há agendamentos elegíveis para esta viagem."
            />
          ) : (
            <div className="flex flex-col gap-[var(--space-4)]">
              <Combobox
                id="vincular-agendamento"
                label="Agendamento"
                placeholder="Selecione o agendamento..."
                value={agendamentoSelecionado}
                options={agendamentoOptions}
                onChange={setAgendamentoSelecionado}
              />
              <Select
                id="vincular-tipo-trecho"
                label="Tipo de trecho"
                options={[...TIPO_TRECHO_OPTIONS]}
                value={tipoTrecho}
                onValueChange={setTipoTrecho}
              />
              {serverError ? <ServerError message={serverError} /> : null}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setVincularOpen(false)}>
              Voltar
            </Button>
            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
              <Button
                type="button"
                variant="primary"
                disabled={isPending || loadingDisponiveis || agendamentosDisponiveis.length === 0}
                onClick={handleVincular}
              >
                {isPending ? <Spinner className="size-4" /> : 'Vincular'}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
