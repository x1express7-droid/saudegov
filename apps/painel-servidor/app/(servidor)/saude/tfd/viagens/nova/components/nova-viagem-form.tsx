'use client'

import {
  criarViagem,
  mudarStatusViagem,
  vincularAgendamentoNaViagem,
} from '@saude/mod-saude-tfd/actions/viagem-nova'
import {
  formatCnhCategorias,
  type AgendamentoDisponivelViagemItem,
  type TfdMotoristaAgendamentoItem,
  type TfdVeiculoAgendamentoItem,
} from '@saude/mod-saude-tfd/client'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Combobox,
  EmptyState,
  Input,
  Select,
  Spinner,
  Textarea,
  cn,
  formFieldsGridClassName,
  formFieldsStackClassName,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { ViagemOcupacaoPanel } from '../../components/viagem-ocupacao-panel'
import {
  buscarAgendamentosDisponiveisViagemAction,
  buscarMotoristasViagemAction,
} from '../actions'

const TIPO_TRECHO_OPTIONS = [
  { value: 'IDA', label: 'Ida' },
  { value: 'VOLTA', label: 'Volta' },
  { value: 'IDA_VOLTA', label: 'Ida e volta' },
] as const

type SubmitMode = 'planejada' | 'confirmada'

interface PassageiroSelecionado {
  agendamentoId: string
  tipoTrecho: 'IDA' | 'VOLTA' | 'IDA_VOLTA'
  acompanhantesCount: number
}

function FormError({ message }: { message: string }) {
  return (
    <Alert variant="error" role="alert">
      {message}
    </Alert>
  )
}

function labelTipoViagem(tipo: string | null): string {
  if (tipo === 'IDA') return 'Ida'
  if (tipo === 'VOLTA') return 'Volta'
  if (tipo === 'IDA_VOLTA') return 'Ida e volta'
  return 'Não informado'
}

function resolveTipoTrecho(
  agendamento: AgendamentoDisponivelViagemItem,
  override?: 'IDA' | 'VOLTA' | 'IDA_VOLTA'
): 'IDA' | 'VOLTA' | 'IDA_VOLTA' {
  if (override) {
    return override
  }
  if (agendamento.tipoViagem === 'VOLTA') {
    return 'VOLTA'
  }
  if (agendamento.tipoViagem === 'IDA_VOLTA') {
    return 'IDA'
  }
  return 'IDA'
}

function isCnhVencendoEmBreve(validadeIso: string): boolean {
  const vencimento = new Date(`${validadeIso}T12:00:00`)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite = new Date(hoje)
  limite.setDate(limite.getDate() + 30)
  return vencimento >= hoje && vencimento <= limite
}

export interface NovaViagemFormProps {
  session: SaudeMunicSession
  veiculos: TfdVeiculoAgendamentoItem[]
  processos: Array<{ value: string; label: string }>
  processoIdInicial?: string
  agendamentoIdPreSelecionado?: string
}

export function NovaViagemForm({
  session,
  veiculos,
  processos,
  processoIdInicial,
  agendamentoIdPreSelecionado,
}: NovaViagemFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitMode, setSubmitMode] = useState<SubmitMode>('planejada')

  const [processoId, setProcessoId] = useState(processoIdInicial ?? '')
  const [origemDescricao, setOrigemDescricao] = useState('')
  const [destinoDescricao, setDestinoDescricao] = useState('')
  const [dataSaida, setDataSaida] = useState('')
  const [horaSaida, setHoraSaida] = useState('')
  const [tempoEstimadoMin, setTempoEstimadoMin] = useState('')
  const [custoEstimado, setCustoEstimado] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [veiculoId, setVeiculoId] = useState('')
  const [motoristaId, setMotoristaId] = useState('')

  const [agendamentos, setAgendamentos] = useState<AgendamentoDisponivelViagemItem[]>([])
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false)
  const [agendamentosError, setAgendamentosError] = useState<string | null>(null)

  const [motoristas, setMotoristas] = useState<TfdMotoristaAgendamentoItem[]>([])
  const [loadingMotoristas, setLoadingMotoristas] = useState(false)

  const [passageirosSelecionados, setPassageirosSelecionados] = useState<
    Record<string, PassageiroSelecionado>
  >({})
  const [trechoOverrides, setTrechoOverrides] = useState<Record<string, string>>({})

  const veiculoOptions = useMemo(
    () =>
      veiculos.map((item) => ({
        value: item.id,
        label: `${item.placa} — ${item.modelo} (${item.capacidadePassageiros} lugares)`,
      })),
    [veiculos]
  )

  const veiculoSelecionado = veiculos.find((item) => item.id === veiculoId) ?? null

  const motoristaOptions = useMemo(
    () =>
      motoristas.map((item) => ({
        value: item.id,
        label: `${item.nome} — CNH ${formatCnhCategorias(item.cnhCategoria)} (válida até ${item.cnhValidade})`,
      })),
    [motoristas]
  )

  const motoristaSelecionado = motoristas.find((item) => item.id === motoristaId) ?? null

  const vagasOcupadas = useMemo(
    () =>
      Object.values(passageirosSelecionados).reduce(
        (total, item) => total + 1 + item.acompanhantesCount,
        0
      ),
    [passageirosSelecionados]
  )

  useEffect(() => {
    if (!processoId) {
      setAgendamentos([])
      setPassageirosSelecionados({})
      return
    }

    let cancelled = false
    setLoadingAgendamentos(true)
    setAgendamentosError(null)

    void buscarAgendamentosDisponiveisViagemAction(processoId, dataSaida || undefined).then(
      (items) => {
      if (cancelled) {
        return
      }
      setLoadingAgendamentos(false)
      setAgendamentos(items)

      if (agendamentoIdPreSelecionado) {
        const alvo = items.find((item) => item.id === agendamentoIdPreSelecionado)
        if (alvo) {
          setPassageirosSelecionados({
            [alvo.id]: {
              agendamentoId: alvo.id,
              tipoTrecho: resolveTipoTrecho(alvo),
              acompanhantesCount: alvo.acompanhantesCount,
            },
          })
        }
      }
    }
    )

    return () => {
      cancelled = true
    }
  }, [processoId, dataSaida, agendamentoIdPreSelecionado])

  useEffect(() => {
    if (!dataSaida) {
      setMotoristas([])
      setMotoristaId('')
      return
    }

    let cancelled = false
    setLoadingMotoristas(true)
    setMotoristaId('')

    void buscarMotoristasViagemAction(dataSaida).then((items) => {
      if (cancelled) {
        return
      }
      setLoadingMotoristas(false)
      setMotoristas(items)
    })

    return () => {
      cancelled = true
    }
  }, [dataSaida])

  function togglePassageiro(agendamento: AgendamentoDisponivelViagemItem) {
    setPassageirosSelecionados((current) => {
      if (current[agendamento.id]) {
        const next = { ...current }
        delete next[agendamento.id]
        return next
      }

      const tipoTrecho = resolveTipoTrecho(
        agendamento,
        trechoOverrides[agendamento.id] as 'IDA' | 'VOLTA' | 'IDA_VOLTA' | undefined
      )

      return {
        ...current,
        [agendamento.id]: {
          agendamentoId: agendamento.id,
          tipoTrecho,
          acompanhantesCount: agendamento.acompanhantesCount,
        },
      }
    })
  }

  function handleSubmit(mode: SubmitMode) {
    setSubmitMode(mode)
    setServerError(null)

    if (!processoId) {
      setServerError('Selecione o processo da viagem.')
      return
    }

    startTransition(async () => {
      const payload = {
        processoId,
        veiculoId: veiculoId || undefined,
        motoristaId: motoristaId || undefined,
        dataSaida,
        horaSaida: horaSaida || undefined,
        origemDescricao,
        destinoDescricao,
        tempoEstimadoMin: tempoEstimadoMin ? Number.parseInt(tempoEstimadoMin, 10) : undefined,
        custoEstimado: custoEstimado ? Number.parseFloat(custoEstimado.replace(',', '.')) : undefined,
        observacoes: observacoes || undefined,
      }

      const criarResult = await criarViagem(payload)
      if (!criarResult.success) {
        setServerError(criarResult.error ?? 'Não foi possível criar a viagem.')
        return
      }

      const viagemId = criarResult.data!.viagemId

      for (const passageiro of Object.values(passageirosSelecionados)) {
        const vincularResult = await vincularAgendamentoNaViagem({
          viagemId,
          agendamentoId: passageiro.agendamentoId,
          tipoTrecho: passageiro.tipoTrecho,
        })

        if (!vincularResult.success) {
          setServerError(vincularResult.error ?? 'Viagem criada, mas falha ao vincular passageiro.')
          router.push(`/saude/tfd/viagens/${viagemId}`)
          return
        }
      }

      if (mode === 'confirmada') {
        const statusResult = await mudarStatusViagem({
          viagemId,
          novoStatus: 'CONFIRMADA',
        })

        if (!statusResult.success) {
          setServerError(statusResult.error ?? 'Viagem criada, mas não foi possível confirmá-la.')
          router.push(`/saude/tfd/viagens/${viagemId}?tab=segmentos`)
          return
        }

        router.push(`/saude/tfd/viagens/${viagemId}?tab=segmentos`)
        return
      }

      router.push(`/saude/tfd/viagens/${viagemId}`)
    })
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      {serverError ? <FormError message={serverError} /> : null}

      <Card
        header={<CardHeader>Dados da viagem</CardHeader>}
        bodyClassName={formFieldsStackClassName()}
      >
        <div className={formFieldsStackClassName()}>
          <Combobox
            id="nova-viagem-processo"
            label="Processo"
            placeholder="Buscar processo por protocolo ou paciente..."
            value={processoId}
            options={processos}
            onChange={(value) => {
              setProcessoId(value)
              setPassageirosSelecionados({})
            }}
            required
          />
          <div className={formFieldsGridClassName()}>
            <Input
              id="nova-viagem-origem"
              label="Origem"
              value={origemDescricao}
              onChange={(event) => setOrigemDescricao(event.target.value)}
              required
            />
            <Input
              id="nova-viagem-destino"
              label="Destino"
              value={destinoDescricao}
              onChange={(event) => setDestinoDescricao(event.target.value)}
              required
            />
          </div>
          <div className={formFieldsGridClassName()}>
            <Input
              id="nova-viagem-data-saida"
              label="Data de saída"
              type="date"
              value={dataSaida}
              onChange={(event) => setDataSaida(event.target.value)}
              required
            />
            <Input
              id="nova-viagem-hora-saida"
              label="Hora de saída"
              type="time"
              value={horaSaida}
              onChange={(event) => setHoraSaida(event.target.value)}
            />
          </div>
          <div className={formFieldsGridClassName()}>
            <Input
              id="nova-viagem-tempo-estimado"
              label="Tempo estimado (min)"
              type="number"
              min={1}
              value={tempoEstimadoMin}
              onChange={(event) => setTempoEstimadoMin(event.target.value)}
            />
            <Input
              id="nova-viagem-custo-estimado"
              label="Custo estimado (R$)"
              inputMode="decimal"
              value={custoEstimado}
              onChange={(event) => setCustoEstimado(event.target.value)}
            />
          </div>
          <Textarea
            id="nova-viagem-observacoes"
            label="Observações"
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            rows={3}
          />
        </div>
      </Card>

      <Card
        header={<CardHeader>Alocação de veículo e motorista</CardHeader>}
        bodyClassName={formFieldsStackClassName()}
      >
        <div className={formFieldsStackClassName()}>
          <Combobox
            id="nova-viagem-veiculo"
            label="Veículo"
            placeholder="Selecione o veículo..."
            value={veiculoId}
            options={veiculoOptions}
            onChange={setVeiculoId}
          />
          {veiculoSelecionado ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Capacidade: {veiculoSelecionado.capacidadePassageiros} passageiros
            </p>
          ) : null}

          <Combobox
            id="nova-viagem-motorista"
            label="Motorista"
            placeholder={dataSaida ? 'Selecione o motorista...' : 'Informe a data de saída primeiro'}
            value={motoristaId}
            options={motoristaOptions}
            onChange={setMotoristaId}
            loading={loadingMotoristas}
            disabled={!dataSaida}
          />

          {motoristaSelecionado ? (
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                CNH válida até {motoristaSelecionado.cnhValidade}
              </span>
              {isCnhVencendoEmBreve(motoristaSelecionado.cnhValidade) ? (
                <Badge variant="yellow">VENCENDO</Badge>
              ) : (
                <Badge variant="green">VÁLIDA</Badge>
              )}
            </div>
          ) : null}

          <ViagemOcupacaoPanel
            ocupadas={vagasOcupadas}
            capacidade={veiculoSelecionado?.capacidadePassageiros ?? null}
          />
        </div>
      </Card>

      <Card header={<CardHeader>Passageiros</CardHeader>} bodyClassName={formFieldsStackClassName()}>
        <div className={formFieldsStackClassName()}>
          {!processoId || !dataSaida ? (
            <EmptyState
              titulo="Selecione processo e data"
              descricao="Informe o processo e a data de saída para listar agendamentos disponíveis."
            />
          ) : loadingAgendamentos ? (
            <div className="flex items-center gap-[var(--space-2)] text-[var(--color-text-muted)]">
              <Spinner className="size-4" />
              Carregando agendamentos...
            </div>
          ) : agendamentosError ? (
            <FormError message={agendamentosError} />
          ) : agendamentos.length === 0 ? (
            <EmptyState
              titulo="Nenhum agendamento disponível"
              descricao="Não há agendamentos elegíveis para esta data e processo."
            />
          ) : (
            <ul className="flex flex-col gap-[var(--space-3)]">
              {agendamentos.map((agendamento) => {
                const selecionado = Boolean(passageirosSelecionados[agendamento.id])
                const precisaTrecho = agendamento.tipoViagem === 'IDA_VOLTA' || !agendamento.tipoViagem

                return (
                  <li
                    key={agendamento.id}
                    className={cn(
                      'rounded-[var(--radius-md)] border p-[var(--space-4)]',
                      selecionado
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/20'
                        : 'border-[var(--color-border)]'
                    )}
                  >
                    <label className="flex cursor-pointer items-start gap-[var(--space-3)]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selecionado}
                        onChange={() => togglePassageiro(agendamento)}
                      />
                      <span className="flex flex-1 flex-col gap-[var(--space-1)]">
                        <span className="font-medium text-[var(--color-text)]">
                          {agendamento.paciente.nome}
                        </span>
                        <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                          Consulta: {agendamento.dataConsulta} · {agendamento.tipoAtendimento} ·{' '}
                          {labelTipoViagem(agendamento.tipoViagem)} ·{' '}
                          {agendamento.acompanhantesCount} acompanhante(s)
                        </span>
                      </span>
                    </label>
                    {selecionado && precisaTrecho ? (
                      <div className="mt-[var(--space-3)] max-w-xs">
                        <Select
                          id={`trecho-${agendamento.id}`}
                          label="Tipo de trecho"
                          options={[...TIPO_TRECHO_OPTIONS]}
                          value={trechoOverrides[agendamento.id] ?? 'IDA'}
                          onValueChange={(value) => {
                            setTrechoOverrides((current) => ({ ...current, [agendamento.id]: value }))
                            setPassageirosSelecionados((current) => {
                              const atual = current[agendamento.id]
                              if (!atual) {
                                return current
                              }
                              return {
                                ...current,
                                [agendamento.id]: {
                                  ...atual,
                                  tipoTrecho: value as 'IDA' | 'VOLTA' | 'IDA_VOLTA',
                                },
                              }
                            })
                          }}
                        />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}

          <ViagemOcupacaoPanel
            ocupadas={vagasOcupadas}
            capacidade={veiculoSelecionado?.capacidadePassageiros ?? null}
          />
        </div>
      </Card>

      <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
        <div className="flex flex-wrap gap-[var(--space-3)]">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleSubmit('planejada')}
          >
            {isPending && submitMode === 'planejada' ? (
              <>
                <Spinner className="mr-[var(--space-2)] size-4" />
                Salvando...
              </>
            ) : (
              'Salvar como Planejada'
            )}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() => handleSubmit('confirmada')}
          >
            {isPending && submitMode === 'confirmada' ? (
              <>
                <Spinner className="mr-[var(--space-2)] size-4" />
                Confirmando...
              </>
            ) : (
              'Salvar e Confirmar'
            )}
          </Button>
        </div>
      </PermissionGate>
    </div>
  )
}
