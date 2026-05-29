'use client'

import { criarAgendamentoNovo } from '@saude/mod-saude-tfd/actions/agendamento'
import type {
  TfdPrestadorListItem,
  TfdProcedimentoListItem,
} from '@saude/mod-saude-tfd/client'
import {
  labelRelacaoAcompanhante,
  type AcompanhanteSolicitacaoOption,
} from '@saude/mod-saude-tfd/client'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Combobox,
  EmptyState,
  Input,
  Spinner,
  Textarea,
  cn,
  formFieldsGridClassName,
  formFieldsStackClassName,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

const TIPO_ATENDIMENTO_OPTIONS = [
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'RETORNO', label: 'Retorno' },
  { value: 'EXAME', label: 'Exame' },
  { value: 'CIRURGIA', label: 'Cirurgia' },
] as const

const CONVENIO_OPTIONS = [
  { value: 'SUS', label: 'SUS' },
  { value: 'PARTICULAR', label: 'Particular' },
] as const

const TIPO_VIAGEM_OPTIONS = [
  { value: 'IDA', label: 'Somente ida' },
  { value: 'VOLTA', label: 'Somente volta' },
  { value: 'IDA_VOLTA', label: 'Ida e volta' },
] as const

type SubmitMode = 'processo' | 'alocacao'

interface LocalAdicionalFormItem {
  clientId: string
  prestadorId: string
  procedimentoId: string
  horario: string
  observacao: string
}

interface NovoAcompanhanteFormItem {
  clientId: string
  nome: string
  telefone: string
}

function createClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function FormError({ message }: { message: string }) {
  return (
    <Alert variant="error" role="alert">
      {message}
    </Alert>
  )
}

export interface AgendamentoNovoFormProps {
  session: SaudeMunicSession
  processoId: string
  solicitacaoId: string
  pacienteNome: string
  protocoloProcesso: string
  especialidadeNome: string
  especialidadeId: string | null
  minDataConsulta: string
  minDataConsultaLabel: string
  prestadores: TfdPrestadorListItem[]
  procedimentos: TfdProcedimentoListItem[]
  acompanhantes: AcompanhanteSolicitacaoOption[]
  tipoAtendimentoInicial?: string
  prestadorIdInicial?: string | null
}

export function AgendamentoNovoForm({
  session,
  processoId,
  solicitacaoId,
  pacienteNome,
  protocoloProcesso,
  especialidadeNome,
  especialidadeId,
  minDataConsulta,
  minDataConsultaLabel,
  prestadores,
  procedimentos,
  acompanhantes,
  tipoAtendimentoInicial,
  prestadorIdInicial,
}: AgendamentoNovoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitMode, setSubmitMode] = useState<SubmitMode>('processo')

  const [dataConsulta, setDataConsulta] = useState('')
  const [horaConsulta, setHoraConsulta] = useState('')
  const [prestadorId, setPrestadorId] = useState(prestadorIdInicial ?? '')
  const [profissionalNome, setProfissionalNome] = useState('')
  const [horaLocal, setHoraLocal] = useState('')
  const [tipoAtendimento, setTipoAtendimento] = useState(
    tipoAtendimentoInicial && TIPO_ATENDIMENTO_OPTIONS.some((o) => o.value === tipoAtendimentoInicial)
      ? tipoAtendimentoInicial
      : 'CONSULTA'
  )
  const [convenio, setConvenio] = useState('SUS')
  const [tipoViagem, setTipoViagem] = useState('IDA')
  const [orientacoes, setOrientacoes] = useState('')
  const [locaisAdicionais, setLocaisAdicionais] = useState<LocalAdicionalFormItem[]>([])
  const [acompanhanteIdsSelecionados, setAcompanhanteIdsSelecionados] = useState<string[]>([])
  const [novosAcompanhantes, setNovosAcompanhantes] = useState<NovoAcompanhanteFormItem[]>([])
  const [showNovoAcompanhanteForm, setShowNovoAcompanhanteForm] = useState(false)
  const [novoAcompanhanteNome, setNovoAcompanhanteNome] = useState('')
  const [novoAcompanhanteTelefone, setNovoAcompanhanteTelefone] = useState('')

  const prestadorOptions = useMemo(
    () =>
      prestadores
        .filter(
          (item) =>
            item.ativo &&
            (especialidadeId ? item.especialidadeIds.includes(especialidadeId) : true)
        )
        .map((item) => ({
          value: item.id,
          label: `${item.nome} (${item.cidade}/${item.estado})`,
        })),
    [prestadores, especialidadeId]
  )

  const procedimentoOptions = useMemo(
    () =>
      procedimentos
        .filter((item) => item.ativo)
        .map((item) => ({
          value: item.id,
          label: item.codigoSigtap ? `${item.nome} (${item.codigoSigtap})` : item.nome,
        })),
    [procedimentos]
  )

  const totalAcompanhantesSelecionados =
    acompanhanteIdsSelecionados.length + novosAcompanhantes.length

  function toggleAcompanhante(id: string) {
    setAcompanhanteIdsSelecionados((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function adicionarLocalAdicional() {
    setLocaisAdicionais((current) => [
      ...current,
      {
        clientId: createClientId(),
        prestadorId: '',
        procedimentoId: '',
        horario: '',
        observacao: '',
      },
    ])
  }

  function atualizarLocalAdicional(
    clientId: string,
    patch: Partial<Omit<LocalAdicionalFormItem, 'clientId'>>
  ) {
    setLocaisAdicionais((current) =>
      current.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item))
    )
  }

  function removerLocalAdicional(clientId: string) {
    setLocaisAdicionais((current) => current.filter((item) => item.clientId !== clientId))
  }

  function adicionarNovoAcompanhante() {
    const nome = novoAcompanhanteNome.trim()
    if (nome.length < 2) {
      setServerError('Informe o nome do acompanhante com pelo menos 2 caracteres.')
      return
    }

    setNovosAcompanhantes((current) => [
      ...current,
      {
        clientId: createClientId(),
        nome,
        telefone: novoAcompanhanteTelefone.trim(),
      },
    ])
    setNovoAcompanhanteNome('')
    setNovoAcompanhanteTelefone('')
    setShowNovoAcompanhanteForm(false)
    setServerError(null)
  }

  function removerNovoAcompanhante(clientId: string) {
    setNovosAcompanhantes((current) => current.filter((item) => item.clientId !== clientId))
  }

  function validarFormulario(): string | null {
    if (!dataConsulta) {
      return 'Informe a data da consulta.'
    }

    if (dataConsulta < minDataConsulta) {
      return `A data da consulta deve ser pelo menos 72 horas após o momento atual (a partir de ${minDataConsultaLabel}).`
    }

    if (!convenio) {
      return 'Selecione o convênio.'
    }

    if (!tipoViagem) {
      return 'Selecione o tipo de viagem.'
    }

    return null
  }

  function handleSubmit(mode: SubmitMode) {
    setServerError(null)
    setSubmitMode(mode)

    const validationError = validarFormulario()
    if (validationError) {
      setServerError(validationError)
      return
    }

    const horaFinal = horaConsulta.trim() || horaLocal.trim() || undefined

    startTransition(async () => {
      const result = await criarAgendamentoNovo({
        processoId,
        solicitacaoId,
        dataConsulta,
        horaConsulta: horaFinal,
        prestadorId: prestadorId || undefined,
        profissionalNome: profissionalNome.trim() || undefined,
        tipoAtendimento: tipoAtendimento as 'CONSULTA' | 'RETORNO' | 'EXAME' | 'CIRURGIA',
        convenio: convenio as 'SUS' | 'PARTICULAR',
        tipoViagem: tipoViagem as 'IDA' | 'VOLTA' | 'IDA_VOLTA',
        acompanhanteIds: acompanhanteIdsSelecionados,
        novosAcompanhantes: novosAcompanhantes.map((item) => ({
          nome: item.nome,
          telefone: item.telefone.trim() || undefined,
        })),
        locaisAdicionais: locaisAdicionais.map((item) => ({
          prestadorId: item.prestadorId || undefined,
          procedimentoId: item.procedimentoId || undefined,
          horario: item.horario.trim() || undefined,
          observacao: item.observacao.trim() || undefined,
        })),
        orientacoes: orientacoes.trim() || undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível criar o agendamento.')
        return
      }

      const agendamentoId = result.data!.agendamentoId

      if (mode === 'alocacao') {
        router.push(`/saude/tfd/viagens/nova?agendamentoId=${encodeURIComponent(agendamentoId)}`)
      } else {
        router.push(`/saude/tfd/processos/${processoId}`)
      }

      router.refresh()
    })
  }

  return (
    <form
      className="flex flex-col gap-[var(--space-6)]"
      onSubmit={(event) => event.preventDefault()}
      noValidate
    >
      <Card
        header={<CardHeader>Dados da consulta</CardHeader>}
        bodyClassName={formFieldsStackClassName()}
      >
        <div className={formFieldsGridClassName()}>
          <Input id="paciente-nome" label="Paciente" value={pacienteNome} disabled readOnly />
          <Input
            id="protocolo-processo"
            label="Protocolo"
            value={protocoloProcesso}
            disabled
            readOnly
            className="font-[family-name:var(--font-mono)]"
          />
          <Input
            id="especialidade-nome"
            label="Especialidade"
            value={especialidadeNome}
            disabled
            readOnly
          />
        </div>

        <div className={formFieldsGridClassName()}>
          <Input
            label="Data da consulta"
            type="date"
            value={dataConsulta}
            min={minDataConsulta}
            onChange={(event) => setDataConsulta(event.target.value)}
            disabled={isPending}
            required
            hint={`Antecedência mínima de 72 horas: consultas a partir de ${minDataConsultaLabel}.`}
          />
          <Input
            label="Hora da consulta (opcional)"
            type="time"
            value={horaConsulta}
            onChange={(event) => setHoraConsulta(event.target.value)}
            disabled={isPending}
          />
          <Combobox
            label="Tipo de atendimento"
            value={tipoAtendimento}
            options={[...TIPO_ATENDIMENTO_OPTIONS]}
            onChange={setTipoAtendimento}
            disabled={isPending}
            placeholder="Selecione o tipo de atendimento"
          />
          <Combobox
            label="Convênio"
            value={convenio}
            options={[...CONVENIO_OPTIONS]}
            onChange={setConvenio}
            disabled={isPending}
            placeholder="Selecione o convênio"
          />
          <Combobox
            label="Tipo de viagem"
            value={tipoViagem}
            options={[...TIPO_VIAGEM_OPTIONS]}
            onChange={setTipoViagem}
            disabled={isPending}
            placeholder="Selecione o tipo de viagem"
          />
        </div>
      </Card>

      <Card
        header={<CardHeader>Local principal</CardHeader>}
        bodyClassName={formFieldsStackClassName()}
      >
        <Combobox
          label="Prestador"
          value={prestadorId}
          placeholder={
            prestadorOptions.length > 0 ? 'Selecione o prestador' : 'Nenhum prestador cadastrado'
          }
          options={prestadorOptions}
          onChange={setPrestadorId}
          disabled={isPending || prestadorOptions.length === 0}
        />

        <div className={formFieldsGridClassName()}>
          <Input
            label="Profissional que atenderá (opcional)"
            value={profissionalNome}
            onChange={(event) => setProfissionalNome(event.target.value)}
            disabled={isPending}
            maxLength={200}
          />
          <Input
            label="Hora no local (opcional)"
            type="time"
            value={horaLocal}
            onChange={(event) => setHoraLocal(event.target.value)}
            disabled={isPending}
            hint="Use quando o horário no local principal for diferente da consulta."
          />
        </div>
      </Card>

      <Card header={<CardHeader>Locais adicionais</CardHeader>} bodyClassName={formFieldsStackClassName()}>
        {locaisAdicionais.length === 0 ? (
          <EmptyState
            titulo="Nenhum local adicional cadastrado"
            className="border-[var(--color-border)] bg-[var(--color-bg)] py-[var(--space-6)]"
          />
        ) : (
          <ul className="flex flex-col gap-[var(--space-4)]" role="list">
            {locaisAdicionais.map((local, index) => (
              <li
                key={local.clientId}
                className="rounded-[var(--radius)] border border-[var(--color-border)] p-[var(--space-4)]"
              >
                <div className="mb-[var(--space-3)] flex items-center justify-between gap-[var(--space-2)]">
                  <p className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                    Local adicional {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remover local adicional ${index + 1}`}
                    disabled={isPending}
                    onClick={() => removerLocalAdicional(local.clientId)}
                    className="min-h-[44px] min-w-[44px] px-[var(--space-2)]"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className={formFieldsStackClassName()}>
                  <div className={formFieldsGridClassName()}>
                    <Combobox
                      label="Prestador"
                      value={local.prestadorId}
                      options={prestadorOptions}
                      onChange={(value) =>
                        atualizarLocalAdicional(local.clientId, { prestadorId: value })
                      }
                      disabled={isPending || prestadorOptions.length === 0}
                      placeholder="Selecione o prestador"
                    />
                    <Combobox
                      label="Procedimento"
                      value={local.procedimentoId}
                      options={procedimentoOptions}
                      onChange={(value) =>
                        atualizarLocalAdicional(local.clientId, { procedimentoId: value })
                      }
                      disabled={isPending || procedimentoOptions.length === 0}
                      placeholder={
                        procedimentoOptions.length > 0
                          ? 'Selecione o procedimento'
                          : 'Nenhum procedimento cadastrado'
                      }
                    />
                  </div>
                  <div className={formFieldsGridClassName()}>
                    <Input
                      label="Horário (opcional)"
                      type="time"
                      value={local.horario}
                      onChange={(event) =>
                        atualizarLocalAdicional(local.clientId, { horario: event.target.value })
                      }
                      disabled={isPending}
                    />
                    <Input
                      label="Observação (opcional)"
                      value={local.observacao}
                      onChange={(event) =>
                        atualizarLocalAdicional(local.clientId, { observacao: event.target.value })
                      }
                      disabled={isPending}
                      maxLength={500}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={isPending}
          onClick={adicionarLocalAdicional}
        >
          <Plus className="size-4" aria-hidden="true" />
          Adicionar local
        </Button>
      </Card>

      <Card header={<CardHeader>Acompanhantes</CardHeader>} bodyClassName={formFieldsStackClassName()}>
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          {totalAcompanhantesSelecionados}{' '}
          {totalAcompanhantesSelecionados === 1
            ? 'acompanhante selecionado'
            : 'acompanhantes selecionados'}
        </p>

        {acompanhantes.length > 0 ? (
          <ul className="flex flex-col gap-[var(--space-2)]" role="list">
            {acompanhantes.map((acompanhante) => {
              const checked = acompanhanteIdsSelecionados.includes(acompanhante.id)
              return (
                <li key={acompanhante.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)]',
                      checked && 'border-[var(--color-primary)] bg-[var(--color-primary-light)]',
                      isPending && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-primary)]"
                      checked={checked}
                      disabled={isPending}
                      onChange={() => toggleAcompanhante(acompanhante.id)}
                    />
                    <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                      {acompanhante.nome} — {labelRelacaoAcompanhante(acompanhante.relacao)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Nenhum acompanhante cadastrado na solicitação.
          </p>
        )}

        {novosAcompanhantes.length > 0 ? (
          <ul className="flex flex-col gap-[var(--space-2)]" role="list">
            {novosAcompanhantes.map((acompanhante) => (
              <li
                key={acompanhante.clientId}
                className="flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)]"
              >
                <div className="min-w-0">
                  <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                    {acompanhante.nome}
                  </p>
                  {acompanhante.telefone ? (
                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      {acompanhante.telefone}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remover acompanhante ${acompanhante.nome}`}
                  disabled={isPending}
                  onClick={() => removerNovoAcompanhante(acompanhante.clientId)}
                  className="min-h-[44px] min-w-[44px] px-[var(--space-2)]"
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {showNovoAcompanhanteForm ? (
          <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)]">
            <div className={formFieldsGridClassName()}>
              <Input
                label="Nome do acompanhante"
                value={novoAcompanhanteNome}
                onChange={(event) => setNovoAcompanhanteNome(event.target.value)}
                disabled={isPending}
                required
                maxLength={200}
              />
              <Input
                label="Telefone (opcional)"
                value={novoAcompanhanteTelefone}
                onChange={(event) => setNovoAcompanhanteTelefone(event.target.value)}
                disabled={isPending}
                maxLength={20}
              />
            </div>
            <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
              <Button
                type="button"
                variant="primary"
                disabled={isPending || novoAcompanhanteNome.trim().length < 2}
                onClick={adicionarNovoAcompanhante}
              >
                Confirmar acompanhante
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setShowNovoAcompanhanteForm(false)
                  setNovoAcompanhanteNome('')
                  setNovoAcompanhanteTelefone('')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={isPending}
          onClick={() => setShowNovoAcompanhanteForm(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Adicionar acompanhante
        </Button>
      </Card>

      <Card header={<CardHeader>Observações</CardHeader>} bodyClassName={formFieldsStackClassName()}>
        <Textarea
          label="Orientações (opcional)"
          value={orientacoes}
          onChange={(event) => setOrientacoes(event.target.value)}
          rows={4}
          disabled={isPending}
          maxLength={2000}
          hint="Máximo de 2.000 caracteres."
        />
      </Card>

      {serverError ? <FormError message={serverError} /> : null}

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-[var(--space-6)] sm:flex-row sm:justify-end">
        <PermissionGate session={session} permission={TFD_PERMISSIONS.CRIAR_AGENDAMENTO}>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleSubmit('processo')}
          >
            {isPending && submitMode === 'processo' ? (
              <>
                <Spinner className="size-4" />
                Salvando…
              </>
            ) : (
              'Salvar agendamento'
            )}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() => handleSubmit('alocacao')}
          >
            {isPending && submitMode === 'alocacao' ? (
              <>
                <Spinner className="size-4" />
                Salvando…
              </>
            ) : (
              'Salvar e ir para alocação'
            )}
          </Button>
        </PermissionGate>
      </div>
    </form>
  )
}
