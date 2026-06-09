// BLOCO-CID-COMPLETO
'use client'

import { TFD_SOLICITACOES_PATH } from '@/lib/tfd/routes'
import {
  abrirSolicitacaoSchema,
  type AbrirSolicitacaoInput,
  type TfdEspecialidadeListItem,
  type TfdProcedimentoListItem,
  type TfdSolicitacaoOrigemRetornoItem,
} from '@saude/mod-saude-tfd/client'
import { TFD_TIPO_TRANSPORTE_RECOMENDADO_OPTIONS } from '@saude/mod-saude-tfd/client'
import { abrirSolicitacaoTfd, enviarSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/solicitacao'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Combobox,
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
  type FieldErrors,
  type Resolver,
} from 'react-hook-form'

import { SolicitacaoAcompanhanteSection } from './solicitacao-acompanhante-section'
import { SolicitacaoCidCombobox } from './solicitacao-cid-combobox'
import { SolicitacaoLaudoUpload } from './solicitacao-laudo-upload'
import { SolicitacaoRetornoPicker } from './solicitacao-retorno-picker'

const TFD_LIST_PATH = TFD_SOLICITACOES_PATH

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

function omitAcompanhanteCpfErrors(
  errors: FieldErrors<AbrirSolicitacaoInput>
): FieldErrors<AbrirSolicitacaoInput> {
  if (!errors.acompanhante || typeof errors.acompanhante !== 'object') {
    return errors
  }

  const acompanhanteErrors = { ...errors.acompanhante } as Record<string, unknown>
  delete acompanhanteErrors.cpf

  const next: FieldErrors<AbrirSolicitacaoInput> = { ...errors }
  if (Object.keys(acompanhanteErrors).length === 0) {
    delete next.acompanhante
  } else {
    next.acompanhante = acompanhanteErrors as FieldErrors<AbrirSolicitacaoInput>['acompanhante']
  }

  return next
}

const zodResolveAbrirSolicitacao = zodResolver(
  abrirSolicitacaoSchema
) as Resolver<AbrirSolicitacaoInput>

const abrirSolicitacaoFormResolver: Resolver<AbrirSolicitacaoInput> = async (
  values,
  context,
  options
) => {
  const result = await zodResolveAbrirSolicitacao(values, context, options)

  if (Object.keys(result.errors).length === 0) {
    return result
  }

  const filteredErrors = omitAcompanhanteCpfErrors(result.errors)
  if (Object.keys(filteredErrors).length === 0) {
    return { values, errors: {} }
  }

  return { values: {}, errors: filteredErrors }
}

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
  solicitacoesOrigem: TfdSolicitacaoOrigemRetornoItem[]
  /** Quando informado, vincula a solicitação a um processo TFD existente. */
  processoId?: string
}

function ProcedimentosCheckboxGroup({
  options,
  selectedIds,
  onChange,
  error,
  disabled,
  required = false,
}: {
  options: { value: string; label: string }[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  error?: string
  disabled?: boolean
  required?: boolean
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
        Procedimentos{required ? ' *' : ''}
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
  solicitacoesOrigem,
  processoId,
}: SolicitacaoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [laudoAnexoIds, setLaudoAnexoIds] = useState<string[]>([])
  const [laudoError, setLaudoError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AbrirSolicitacaoInput>({
    resolver: abrirSolicitacaoFormResolver,
    defaultValues: {
      processoId,
      pacienteId: paciente.id,
      especialidadeId: '',
      procedimentos: [],
      tipoAtendimento: 'CONSULTA',
      urgencia: 'BAIXA',
      cidPrincipal: '',
      diagnostico: '',
      tipoTransporteRecomendado: undefined,
      acompanhanteNecessario: false,
      solicitacaoOrigemId: undefined,
      laudoAnexoIds: [],
      observacoesAbertura: '',
    },
  })

  const especialidadeId = watch('especialidadeId')
  const tipoAtendimento = watch('tipoAtendimento')
  const acompanhanteNecessario = watch('acompanhanteNecessario')

  useEffect(() => {
    if (acompanhanteNecessario && !getValues('acompanhante')) {
      setValue('acompanhante', {
        pacienteId: undefined as never,
        relacao: undefined as never,
      })
    }
  }, [acompanhanteNecessario, getValues, setValue])

  const especialidadeObrigatoria =
    tipoAtendimento === 'CONSULTA' || tipoAtendimento === 'RETORNO'
  const exibirProcedimentos = tipoAtendimento === 'EXAME'

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

  useEffect(() => {
    setValue('procedimentos', [])
  }, [especialidadeId, setValue])

  useEffect(() => {
    if (tipoAtendimento !== 'RETORNO') {
      setValue('solicitacaoOrigemId', undefined)
      clearErrors('solicitacaoOrigemId')
    }
    if (tipoAtendimento !== 'EXAME') {
      setValue('procedimentos', [])
      clearErrors('procedimentos')
    }
  }, [tipoAtendimento, setValue, clearErrors])

  useEffect(() => {
    setValue('laudoAnexoIds', laudoAnexoIds)
  }, [laudoAnexoIds, setValue])

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
        const subKey = key.split('.')[1] as 'pacienteId' | 'cpf' | 'relacao' | 'telefone'
        setError(`acompanhante.${subKey}` as const, { message })
        continue
      }

      setError(key as keyof AbrirSolicitacaoInput, { message })
    }
  }

  function buildPayload(values: AbrirSolicitacaoInput): AbrirSolicitacaoInput {
    const especialidadeIdValue = values.especialidadeId?.trim()
      ? values.especialidadeId
      : undefined

    const cidPrincipalValue = values.cidPrincipal?.trim() ? values.cidPrincipal.trim() : undefined

    return {
      ...values,
      processoId: processoId ?? values.processoId,
      pacienteId: paciente.id,
      pacienteCpf: undefined,
      cidPrincipal: cidPrincipalValue,
      especialidadeId: especialidadeIdValue,
      procedimentos: values.procedimentos ?? [],
      laudoAnexoIds: laudoAnexoIds.length > 0 ? laudoAnexoIds : (values.laudoAnexoIds ?? []),
      solicitacaoOrigemId:
        values.tipoAtendimento === 'RETORNO' ? values.solicitacaoOrigemId : undefined,
      acompanhante:
        values.acompanhanteNecessario && values.acompanhante
          ? values.acompanhante
          : undefined,
    }
  }

  function salvarRascunho(values: AbrirSolicitacaoInput) {
    setServerError(null)
    setLaudoError(null)

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
          name="especialidadeId"
          control={control}
          render={({ field }) => (
            <Combobox
              id="especialidade-id"
              label="Especialidade"
              required={especialidadeObrigatoria}
              placeholder="Selecione a especialidade"
              options={especialidadeOptions}
              value={field.value ?? ''}
              onChange={field.onChange}
              disabled={isPending}
              error={errors.especialidadeId?.message}
            />
          )}
        />

        {exibirProcedimentos ? (
          <Controller
            name="procedimentos"
            control={control}
            render={({ field }) => (
              <ProcedimentosCheckboxGroup
                options={procedimentoOptions}
                selectedIds={field.value ?? []}
                onChange={field.onChange}
                disabled={isPending || !especialidadeId}
                required
                error={errors.procedimentos?.message}
              />
            )}
          />
        ) : null}

        <Controller
          name="cidPrincipal"
          control={control}
          render={({ field }) => (
            <SolicitacaoCidCombobox
              value={field.value ?? ''}
              onChange={field.onChange}
              disabled={isPending}
              error={errors.cidPrincipal?.message}
            />
          )}
        />

        <Textarea
          id="diagnostico-solicitacao"
          label="Motivo/Diagnóstico/Justificativa"
          rows={4}
          required
          placeholder="Descreva o motivo do encaminhamento, diagnóstico e justificativa clínica."
          disabled={isPending}
          {...register('diagnostico')}
          error={errors.diagnostico?.message}
        />

        <Controller
          name="tipoTransporteRecomendado"
          control={control}
          render={({ field }) => (
            <Select
              id="tipo-transporte-recomendado"
              label="Tipo de transporte recomendado"
              placeholder="Selecione o tipo de transporte"
              options={[...TFD_TIPO_TRANSPORTE_RECOMENDADO_OPTIONS]}
              value={field.value ?? ''}
              onValueChange={field.onChange}
              disabled={isPending}
              error={errors.tipoTransporteRecomendado?.message}
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

      <Card header={<CardHeader>Necessita de acompanhante</CardHeader>} bodyClassName={formFieldsStackClassName()}>
        <label className="flex cursor-pointer items-center gap-[var(--space-2)]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-primary)]"
            disabled={isPending}
            {...register('acompanhanteNecessario')}
          />
          <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            Paciente necessita de acompanhante
          </span>
        </label>

        <SolicitacaoAcompanhanteSection
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          pacienteId={paciente.id}
          disabled={isPending}
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
        header={
          <div>
            <CardHeader>Laudo médico</CardHeader>
            <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Opcional. PDF, JPEG ou PNG, até 10 MB.
            </p>
          </div>
        }
        bodyClassName={formFieldsStackClassName()}
      >
        <SolicitacaoLaudoUpload
          processoId={processoId}
          disabled={isPending}
          onUploadComplete={(anexoIds) => {
            setLaudoAnexoIds(anexoIds)
            setLaudoError(null)
          }}
        />
        {laudoError ? (
          <Alert variant="error" className="mt-[var(--space-3)]" role="alert">
            {laudoError}
          </Alert>
        ) : null}
        {errors.laudoAnexoIds?.message ? (
          <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-error)]">
            {errors.laudoAnexoIds.message}
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
