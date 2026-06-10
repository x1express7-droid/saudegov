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
  type TfdPrestadorListItem,
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
  formatDateOnlyBr,
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
import {
  LocalEnderecoAutocomplete,
  type MunicipioSedeOption,
} from './local-endereco-autocomplete'

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
  prestadores: TfdPrestadorListItem[]
  municipioSede: MunicipioSedeOption | null
  agendamentoIdPreSelecionado?: string
  dataSaidaInicial?: string
}

export function NovaViagemForm({
  session,
  veiculos,
  prestadores,
  municipioSede,
  agendamentoIdPreSelecionado,
  dataSaidaInicial,
}: NovaViagemFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitMode, setSubmitMode] = useState<SubmitMode>('planejada')

  const [origemDescricao, setOrigemDescricao] = useState('')
  const [destinoDescricao, setDestinoDescricao] = useState('')
  const [dataSaida, setDataSaida] = useState(dataSaidaInicial ?? '')
  const [horaSaida, setHoraSaida] = useState('')
  const [tempoEstimadoMin, setTempoEstimadoMin] = useState('')
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

  // REMOVE-PROCESSO-PARTE-3: busca por data/destino, sem processoId
  useEffect(() => {
    if (!dataSaida) {
      setAgendamentos([])
      if (!agendamentoIdPreSelecionado) {
        setPassageirosSelecionados({})
      }
      return
    }

    let cancelled = false
    setLoadingAgendamentos(true)
    setAgendamentosError(null)

    void buscarAgendamentosDisponiveisViagemAction(
      dataSaida,
      destinoDescricao || undefined
    ).then((items) => {
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
    })

    return () => {
      cancelled = true
    }
  }, [dataSaida, destinoDescricao, agendamentoIdPreSelecionado])

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

    if (!dataSaida) {
      setServerError('Informe a data de saída da viagem.')
      return
    }

    startTransition(async () => {
      const payload = {
        veiculoId: veiculoId || undefined,
        motoristaId: motoristaId || undefined,
        dataSaida,
        horaSaida: horaSaida || undefined,
        origemDescricao,
        destinoDescricao,
        tempoEstimadoMin: tempoEstimadoMin ? Number.parseInt(tempoEstimadoMin, 10) : undefined,
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
          router.push(`/saude/tfd/viagens/${viagemId}`)
          return
        }

        router.push(`/saude/tfd/viagens/${viagemId}`)
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
          <div className={formFieldsGridClassName()}>
            <LocalEnderecoAutocomplete
              id="nova-viagem-origem"
              label="Origem"
              placeholder="Ex: Campo Grande/MS ou Hospital Regional"
              value={origemDescricao}
              onChange={setOrigemDescricao}
              prestadores={prestadores}
              municipioSede={municipioSede}
              required
              disabled={isPending}
            />
            <LocalEnderecoAutocomplete
              id="nova-viagem-destino"
              label="Destino"
              placeholder="Ex: São Paulo/SP ou Hospital das Clínicas"
              value={destinoDescricao}
              onChange={setDestinoDescricao}
              prestadores={prestadores}
              municipioSede={municipioSede}
              required
              disabled={isPending}
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
          <Input
            id="nova-viagem-tempo-estimado"
            label="Tempo estimado (min)"
            type="number"
            min={1}
            value={tempoEstimadoMin}
            onChange={(event) => setTempoEstimadoMin(event.target.value)}
          />
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Os custos serão registrados na Prestação de Contas após a conclusão da viagem.
          </p>
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
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Selecione o veículo e o motorista responsáveis por esta viagem. O motorista só aparece
            após informar a data de saída, pois a CNH é validada para aquela data.
          </p>
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
          {!dataSaida ? (
            <EmptyState
              titulo="Informe a data de saída"
              descricao="Informe a data de saída para ver os agendamentos disponíveis para esta rota."
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
              titulo="Nenhum agendamento encontrado para esta data"
              descricao={`Agendamentos com consulta próxima a ${formatDateOnlyBr(dataSaida)} aparecerão aqui.`}
            />
          ) : (
            <>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Informe a data de saída para carregar os agendamentos disponíveis. Selecione os
                pacientes que embarcarão nesta viagem. Cada passageiro ocupa 1 vaga + vagas dos
                acompanhantes.
              </p>
              <ul className="flex flex-col gap-[var(--space-3)]">
                {agendamentos.map((agendamento) => {
                  const selecionado = Boolean(passageirosSelecionados[agendamento.id])
                  const precisaTrecho =
                    agendamento.tipoViagem === 'IDA_VOLTA' || !agendamento.tipoViagem

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
                            Consulta: {formatDateOnlyBr(agendamento.dataConsulta)} ·{' '}
                            {agendamento.tipoAtendimento} ·{' '}
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
                              setTrechoOverrides((current) => ({
                                ...current,
                                [agendamento.id]: value,
                              }))
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
            </>
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
            title="Salva a viagem para editar depois antes de confirmar"
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
            title="Confirma a viagem — veículo e motorista ficam alocados"
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
