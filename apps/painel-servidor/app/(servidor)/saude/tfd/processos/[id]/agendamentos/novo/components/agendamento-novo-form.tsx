'use client'

import { criarAgendamentoNovo } from '@saude/mod-saude-tfd/actions/agendamento'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Combobox,
  Input,
  Spinner,
  Textarea,
  formFieldsGridClassName,
  formFieldsStackClassName,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

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
  minDataConsulta: string
  minDataConsultaLabel: string
  tipoAtendimentoInicial?: string
}

export function AgendamentoNovoForm({
  session,
  processoId,
  solicitacaoId,
  pacienteNome,
  protocoloProcesso,
  especialidadeNome,
  minDataConsulta,
  minDataConsultaLabel,
  tipoAtendimentoInicial,
}: AgendamentoNovoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitMode, setSubmitMode] = useState<SubmitMode>('processo')

  const [dataConsulta, setDataConsulta] = useState('')
  const [horaConsulta, setHoraConsulta] = useState('')
  const [tipoAtendimento, setTipoAtendimento] = useState(
    tipoAtendimentoInicial && TIPO_ATENDIMENTO_OPTIONS.some((o) => o.value === tipoAtendimentoInicial)
      ? tipoAtendimentoInicial
      : 'CONSULTA'
  )
  const [convenio, setConvenio] = useState('SUS')
  const [tipoViagem, setTipoViagem] = useState('IDA')
  const [orientacoes, setOrientacoes] = useState('')

  function validarFormulario(): string | null {
    if (!dataConsulta) {
      return 'Informe a data da consulta.'
    }

    if (dataConsulta < minDataConsulta) {
      return `A data da consulta deve ser igual ou posterior à data de aprovação da solicitação (a partir de ${minDataConsultaLabel}).`
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

    startTransition(async () => {
      const result = await criarAgendamentoNovo({
        processoId,
        solicitacaoId,
        dataConsulta,
        horaConsulta: horaConsulta.trim() || undefined,
        tipoAtendimento: tipoAtendimento as 'CONSULTA' | 'RETORNO' | 'EXAME' | 'CIRURGIA',
        convenio: convenio as 'SUS' | 'PARTICULAR',
        tipoViagem: tipoViagem as 'IDA' | 'VOLTA' | 'IDA_VOLTA',
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
            hint={`Consultas a partir da data de aprovação da solicitação (${minDataConsultaLabel}).`}
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
          <div className="flex flex-col gap-[var(--space-1)]">
            {/* BLOCO-1: nomenclatura distingue trecho do paciente da entidade Viagem */}
            <Combobox
              label="Trecho do paciente"
              value={tipoViagem}
              options={[...TIPO_VIAGEM_OPTIONS]}
              onChange={setTipoViagem}
              disabled={isPending}
              placeholder="Selecione o trecho"
            />
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Indique se o paciente precisará de transporte somente na ida, somente na volta ou nos
              dois sentidos.
            </p>
          </div>
        </div>
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
              'Salvar e organizar deslocamento' // BLOCO-1: submit leva à organização do deslocamento
            )}
          </Button>
        </PermissionGate>
      </div>
    </form>
  )
}
