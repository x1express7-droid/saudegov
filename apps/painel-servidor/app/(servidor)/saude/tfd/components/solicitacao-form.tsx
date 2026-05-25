'use client'

import { abrirSolicitacaoSchema, type AbrirSolicitacaoInput, type TfdEspecialidadeListItem, type TfdPrestadorListItem, type TfdProcedimentoListItem, type TfdSolicitacaoOrigemRetornoItem } from '@saude/mod-saude-tfd/client'
import { abrirSolicitacaoTfd, enviarSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/solicitacao'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Select,
  Spinner,
  Textarea,
  TFD_URGENCIA_CONFIG,
  cn,
  formFieldsStackClassName,
} from '@saude/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  Controller,
  useForm,
  type Resolver,
} from 'react-hook-form'

import { SolicitacaoAcompanhanteFields } from './solicitacao-acompanhante-fields'
import { SolicitacaoLaudoUpload } from './solicitacao-laudo-upload'
import { SolicitacaoRetornoPicker } from './solicitacao-retorno-picker'

const TFD_LIST_PATH = '/saude/tfd'

const TIPO_ATENDIMENTO_OPTIONS = [
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'RETORNO', label: 'Retorno' },
  { value: 'EXAME', label: 'Exame' },
  { value: 'CIRURGIA', label: 'Cirurgia' },
] as const

const URGENCIA_OPTIONS = Object.entries(TFD_URGENCIA_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}))

export interface SolicitacaoFormPaciente {
  id: string
  nome: string
  /** Indica se o cadastro tem CPF para validação de acompanhante no servidor. */
  possuiCpf: boolean
}

export interface SolicitacaoFormProps {
  paciente: SolicitacaoFormPaciente
  especialidades: TfdEspecialidadeListItem[]
  procedimentos: TfdProcedimentoListItem[]
  prestadores: TfdPrestadorListItem[]
  solicitacoesOrigem: TfdSolicitacaoOrigemRetornoItem[]
}

function ProcedimentosCheckboxGroup({
  options,
  selectedIds,
  onChange,
  error,
  disabled,
}: {
  options: { value: string; label: string }[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  error?: string
  disabled?: boolean
}) {
  function toggle(procedimentoId: string) {
    if (disabled) {
      return
    }
    if (selectedIds.includes(procedimentoId)) {
      onChange(selectedIds.filter((id) => id !== procedimentoId))
    } else {
      onChange([...selectedIds, procedimentoId])
    }
  }

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      <legend className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
        Procedimentos *
      </legend>
      {error ? (
        <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {options.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Selecione uma especialidade para listar os procedimentos.
        </p>
      ) : (
        <ul className="flex max-h-48 flex-col gap-[var(--space-2)] overflow-y-auto rounded-[var(--radius)] border border-[var(--color-border)] p-[var(--space-2)]">
          {options.map((option) => {
            const checked = selectedIds.includes(option.value)
            return (
              <li key={option.value}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)]',
                    checked && 'bg-[var(--color-primary-light)]',
                    disabled && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-primary)]"
                    checked={checked}
                    onChange={() => toggle(option.value)}
                    disabled={disabled}
                  />
                  <span className="text-[length:var(--text-sm)]">{option.label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}

export function SolicitacaoForm({
  paciente,
  especialidades,
  procedimentos,
  prestadores,
  solicitacoesOrigem,
}: SolicitacaoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [laudoAnexoId, setLaudoAnexoId] = useState<string | null>(null)
  const [laudoError, setLaudoError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AbrirSolicitacaoInput>({
    resolver: zodResolver(abrirSolicitacaoSchema) as Resolver<AbrirSolicitacaoInput>,
    defaultValues: {
      pacienteId: paciente.id,
      especialidadeId: '',
      procedimentos: [],
      prestadorId: '',
      tipoAtendimento: 'CONSULTA',
      urgencia: 'BAIXA',
      acompanhanteNecessario: false,
      solicitacaoOrigemId: undefined,
      laudoAnexoId: undefined,
      observacoesAbertura: '',
    },
  })

  const especialidadeId = watch('especialidadeId')
  const tipoAtendimento = watch('tipoAtendimento')
  const acompanhanteNecessario = watch('acompanhanteNecessario')

  const especialidadeOptions = useMemo(
    () =>
      especialidades
        .filter((item) => item.ativa)
        .map((item) => ({ value: item.id, label: item.nome })),
    [especialidades]
  )

  const procedimentoOptions = useMemo(
    () =>
      procedimentos
        .filter((item) => item.ativo && item.especialidadeId === especialidadeId)
        .map((item) => ({
          value: item.id,
          label: item.codigoSigtap
            ? `${item.nome} (${item.codigoSigtap})`
            : item.nome,
        })),
    [procedimentos, especialidadeId]
  )

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
          label: `${item.nome} — ${item.cidade}/${item.estado}`,
        })),
    [prestadores, especialidadeId]
  )

  useEffect(() => {
    setValue('procedimentos', [])
    setValue('prestadorId', '')
  }, [especialidadeId, setValue])

  useEffect(() => {
    if (tipoAtendimento !== 'RETORNO') {
      setValue('solicitacaoOrigemId', undefined)
      clearErrors('solicitacaoOrigemId')
    }
  }, [tipoAtendimento, setValue, clearErrors])

  useEffect(() => {
    if (!acompanhanteNecessario) {
      setValue('acompanhante', undefined)
      clearErrors('acompanhante')
      return
    }

    setValue('acompanhante', {
      nome: '',
      cpf: '',
      relacao: 'OUTRO',
      telefone: '',
    })
  }, [acompanhanteNecessario, setValue, clearErrors])

  useEffect(() => {
    if (laudoAnexoId) {
      setValue('laudoAnexoId', laudoAnexoId)
    }
  }, [laudoAnexoId, setValue])

  function applyFieldErrors(
    fieldErrors?: Partial<Record<string, string[] | undefined>>
  ) {
    if (!fieldErrors) {
      return
    }

    for (const [key, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0]
      if (!message) {
        continue
      }

      if (key.startsWith('acompanhante.')) {
        const subKey = key.split('.')[1] as 'nome' | 'cpf' | 'relacao' | 'telefone'
        setError(`acompanhante.${subKey}` as const, { message })
        continue
      }

      setError(key as keyof AbrirSolicitacaoInput, { message })
    }
  }

  function buildPayload(values: AbrirSolicitacaoInput): AbrirSolicitacaoInput {
    return {
      ...values,
      pacienteId: paciente.id,
      pacienteCpf: undefined,
      laudoAnexoId: laudoAnexoId ?? values.laudoAnexoId,
      solicitacaoOrigemId:
        values.tipoAtendimento === 'RETORNO' ? values.solicitacaoOrigemId : undefined,
      acompanhante: values.acompanhanteNecessario ? values.acompanhante : undefined,
    }
  }

  function validateAcompanhanteRegras(): boolean {
    if (!acompanhanteNecessario) {
      return true
    }
    if (!paciente.possuiCpf) {
      setError('acompanhante', {
        message:
          'Paciente sem CPF cadastrado. Atualize o cadastro antes de informar acompanhante.',
      })
      return false
    }
    return true
  }

  function salvarRascunho(values: AbrirSolicitacaoInput) {
    setServerError(null)
    setLaudoError(null)

    if (!validateAcompanhanteRegras()) {
      return
    }

    startTransition(async () => {
      const response = await abrirSolicitacaoTfd(buildPayload(values))
      if (!response.success) {
        setServerError(response.error)
        if (response.fieldErrors) {
          applyFieldErrors(response.fieldErrors)
        }
        return
      }

      router.push(
        `${TFD_LIST_PATH}?rascunho=${encodeURIComponent(response.data.protocolo)}`
      )
      router.refresh()
    })
  }

  function enviarSolicitacao(values: AbrirSolicitacaoInput) {
    setServerError(null)
    setLaudoError(null)

    if (!laudoAnexoId) {
      setLaudoError('Envie e confirme o laudo médico antes de enviar a solicitação.')
      return
    }

    if (!validateAcompanhanteRegras()) {
      return
    }

    startTransition(async () => {
      const abrirResponse = await abrirSolicitacaoTfd(buildPayload(values))
      if (!abrirResponse.success) {
        setServerError(abrirResponse.error)
        if (abrirResponse.fieldErrors) {
          applyFieldErrors(abrirResponse.fieldErrors)
        }
        return
      }

      const enviarResponse = await enviarSolicitacaoTfd({
        solicitacaoId: abrirResponse.data.solicitacaoId,
      })

      if (!enviarResponse.success) {
        setServerError(enviarResponse.error)
        return
      }

      const { protocolo } = abrirResponse.data
      setSuccessToast(`Solicitação ${protocolo} enviada para regulação.`)

      window.setTimeout(() => {
        router.push(
          `${TFD_LIST_PATH}?enviado=${encodeURIComponent(protocolo)}`
        )
        router.refresh()
      }, 1800)
    })
  }

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={handleSubmit(enviarSolicitacao)}
      noValidate
    >
      {successToast ? (
        <Alert variant="success" role="status">
          {successToast}
        </Alert>
      ) : null}

      {serverError ? (
        <Alert variant="error" role="alert">
          {serverError}
        </Alert>
      ) : null}

      <Card
        header={<CardHeader>Dados da solicitação</CardHeader>}
        bodyClassName={formFieldsStackClassName()}
      >
          <Controller
            name="especialidadeId"
            control={control}
            render={({ field }) => (
              <Select
                id="especialidade-id"
                label="Especialidade"
                required
                placeholder="Selecione a especialidade"
                options={especialidadeOptions}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                error={errors.especialidadeId?.message}
              />
            )}
          />

          <Controller
            name="procedimentos"
            control={control}
            render={({ field }) => (
              <ProcedimentosCheckboxGroup
                options={procedimentoOptions}
                selectedIds={field.value ?? []}
                onChange={field.onChange}
                disabled={isPending || !especialidadeId}
                error={errors.procedimentos?.message}
              />
            )}
          />

          <Controller
            name="prestadorId"
            control={control}
            render={({ field }) => (
              <Select
                id="prestador-id"
                label="Prestador de destino"
                required
                placeholder="Selecione o prestador"
                options={prestadorOptions}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending || !especialidadeId}
                error={errors.prestadorId?.message}
              />
            )}
          />

          <Controller
            name="tipoAtendimento"
            control={control}
            render={({ field }) => (
              <Select
                id="tipo-atendimento"
                label="Tipo de atendimento"
                required
                options={[...TIPO_ATENDIMENTO_OPTIONS]}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                error={errors.tipoAtendimento?.message}
              />
            )}
          />

          <Controller
            name="urgencia"
            control={control}
            render={({ field }) => (
              <Select
                id="urgencia"
                label="Urgência"
                required
                options={URGENCIA_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                error={errors.urgencia?.message}
              />
            )}
          />
      </Card>

      {tipoAtendimento === 'RETORNO' ? (
        <Card header={<CardHeader>Retorno</CardHeader>} bodyClassName={formFieldsStackClassName()}>
          <SolicitacaoRetornoPicker
            control={control}
            errors={errors}
            pacienteId={paciente.id}
            solicitacoesOrigem={solicitacoesOrigem}
            disabled={isPending}
          />
        </Card>
      ) : null}

      <Card
        header={<CardHeader>Laudo médico</CardHeader>}
        bodyClassName={formFieldsStackClassName()}
      >
        <SolicitacaoLaudoUpload
          disabled={isPending}
          onUploadComplete={(anexoId) => {
            setLaudoAnexoId(anexoId)
            setLaudoError(null)
          }}
          onUploadClear={() => {
            setLaudoAnexoId(null)
            setValue('laudoAnexoId', undefined)
          }}
        />
        {laudoError ? (
          <Alert variant="error" className="mt-[var(--space-3)]" role="alert">
            {laudoError}
          </Alert>
        ) : null}
        {errors.laudoAnexoId?.message ? (
          <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-error)]">
            {errors.laudoAnexoId.message}
          </p>
        ) : null}
      </Card>

      <Card header={<CardHeader>Observações</CardHeader>} bodyClassName={formFieldsStackClassName()}>
        <Textarea
          id="observacoes-abertura"
          label="Observações do atendimento"
          rows={4}
          placeholder="Informações relevantes para regulação e acompanhamento do processo."
          disabled={isPending}
          {...register('observacoesAbertura')}
          error={errors.observacoesAbertura?.message}
        />
      </Card>

      <Card
        header={<CardHeader>Acompanhante</CardHeader>}
        bodyClassName={formFieldsStackClassName()}
      >
          <Controller
            name="acompanhanteNecessario"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-[var(--space-2)]">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-primary)]"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  disabled={isPending || !paciente.possuiCpf}
                />
                <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  Paciente necessita de acompanhante (justificado no laudo)
                </span>
              </label>
            )}
          />

          {!paciente.possuiCpf ? (
            <Alert variant="warning">
              Cadastre o CPF do paciente para habilitar o registro de acompanhante.
            </Alert>
          ) : null}

          {acompanhanteNecessario ? (
            <SolicitacaoAcompanhanteFields
              register={register}
              control={control}
              errors={errors}
              disabled={isPending}
            />
          ) : null}
      </Card>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={handleSubmit(salvarRascunho)}
        >
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Salvando…
            </>
          ) : (
            'Salvar rascunho'
          )}
        </Button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Enviando…
            </>
          ) : (
            'Enviar solicitação'
          )}
        </Button>
      </div>
    </form>
  )
}
