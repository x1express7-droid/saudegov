'use client'

import { TFD_SOLICITACOES_PATH } from '@/lib/tfd/routes'
import { resolverProcessoIdSolicitacaoTfd } from '@/lib/actions/resolver-processo-solicitacao-tfd'
import {
  abrirSolicitacaoSchema,
  type AbrirSolicitacaoInput,
  type TfdEspecialidadeListItem,
  type TfdPrestadorListItem,
  type TfdProcedimentoListItem,
  type TfdSolicitacaoOrigemRetornoItem,
} from '@saude/mod-saude-tfd/client'
import { abrirSolicitacaoTfd, enviarSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/solicitacao'
import { salvarDadosClinicosTfd } from '@saude/mod-saude-tfd'
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
  type FieldErrors,
  type Resolver,
} from 'react-hook-form'

import { SolicitacaoAcompanhanteFields } from './solicitacao-acompanhante-fields'
import { SolicitacaoLaudoUpload } from './solicitacao-laudo-upload'
import { SolicitacaoRetornoPicker } from './solicitacao-retorno-picker'

const TFD_LIST_PATH = TFD_SOLICITACOES_PATH

const SOAP_MAX_LENGTH = 5000

interface SoapLocalState {
  subjetivo: string
  objetivo: string
  avaliacao: string
  plano: string
  motivoQuadro: string
  observacao: string
}

const SOAP_INITIAL: SoapLocalState = {
  subjetivo: '',
  objetivo: '',
  avaliacao: '',
  plano: '',
  motivoQuadro: '',
  observacao: '',
}

function hasSoapContent(soap: SoapLocalState): boolean {
  return Boolean(
    soap.subjetivo.trim() ||
      soap.objetivo.trim() ||
      soap.avaliacao.trim() ||
      soap.plano.trim() ||
      soap.motivoQuadro.trim() ||
      soap.observacao.trim()
  )
}

async function persistirDadosClinicosPosAbertura(
  solicitacaoId: string,
  processoIdConhecido: string | undefined,
  soap: SoapLocalState
): Promise<void> {
  if (!hasSoapContent(soap)) {
    return
  }

  let processoId = processoIdConhecido
  if (!processoId) {
    processoId = (await resolverProcessoIdSolicitacaoTfd(solicitacaoId)) ?? undefined
  }

  if (!processoId) {
    console.error('[SolicitacaoForm] processoId não encontrado para salvar dados clínicos.')
    return
  }

  try {
    const result = await salvarDadosClinicosTfd({
      processoId,
      subjetivo: soap.subjetivo.trim() || undefined,
      objetivo: soap.objetivo.trim() || undefined,
      avaliacao: soap.avaliacao.trim() || undefined,
      plano: soap.plano.trim() || undefined,
      motivoQuadro: soap.motivoQuadro.trim() || undefined,
      observacao: soap.observacao.trim() || undefined,
    })

    if (!result.success) {
      console.error('[SolicitacaoForm] Falha ao salvar dados clínicos:', result.error)
    }
  } catch (error) {
    console.error('[SolicitacaoForm] Erro ao salvar dados clínicos:', error)
  }
}

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
  prestadores: TfdPrestadorListItem[]
  solicitacoesOrigem: TfdSolicitacaoOrigemRetornoItem[]
  /** Quando informado, vincula a solicitação a um processo TFD existente. */
  processoId?: string
}

function SoapFieldsSection({
  soap,
  onChange,
  disabled,
}: {
  soap: SoapLocalState
  onChange: (field: keyof SoapLocalState, value: string) => void
  disabled?: boolean
}) {
  return (
    <Card
      header={<CardHeader>Dados clínicos</CardHeader>}
      bodyClassName={formFieldsStackClassName()}
    >
      <Textarea
        id="soap-subjetivo"
        label="Subjetivo"
        rows={3}
        maxLength={SOAP_MAX_LENGTH}
        placeholder="Relato do paciente / queixa principal"
        value={soap.subjetivo}
        onChange={(event) => onChange('subjetivo', event.target.value)}
        disabled={disabled}
      />
      <Textarea
        id="soap-objetivo"
        label="Objetivo"
        rows={3}
        maxLength={SOAP_MAX_LENGTH}
        placeholder="Dados objetivos observados"
        value={soap.objetivo}
        onChange={(event) => onChange('objetivo', event.target.value)}
        disabled={disabled}
      />
      <Textarea
        id="soap-avaliacao"
        label="Avaliação"
        rows={3}
        maxLength={SOAP_MAX_LENGTH}
        placeholder="Avaliação clínica"
        value={soap.avaliacao}
        onChange={(event) => onChange('avaliacao', event.target.value)}
        disabled={disabled}
      />
      <Textarea
        id="soap-plano"
        label="Plano"
        rows={3}
        maxLength={SOAP_MAX_LENGTH}
        placeholder="Plano de tratamento"
        value={soap.plano}
        onChange={(event) => onChange('plano', event.target.value)}
        disabled={disabled}
      />
      <Textarea
        id="soap-motivo-quadro"
        label="Motivo/Quadro"
        rows={3}
        maxLength={SOAP_MAX_LENGTH}
        placeholder="Motivo do encaminhamento / quadro clínico"
        value={soap.motivoQuadro}
        onChange={(event) => onChange('motivoQuadro', event.target.value)}
        disabled={disabled}
      />
      <Textarea
        id="soap-observacao"
        label="Observação"
        rows={3}
        maxLength={SOAP_MAX_LENGTH}
        placeholder="Observações adicionais"
        value={soap.observacao}
        onChange={(event) => onChange('observacao', event.target.value)}
        disabled={disabled}
      />
    </Card>
  )
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
  prestadores,
  solicitacoesOrigem,
  processoId,
}: SolicitacaoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [laudoAnexoIds, setLaudoAnexoIds] = useState<string[]>([])
  const [laudoError, setLaudoError] = useState<string | null>(null)
  const [soap, setSoap] = useState<SoapLocalState>(SOAP_INITIAL)

  function handleSoapChange(field: keyof SoapLocalState, value: string) {
    setSoap((prev) => ({ ...prev, [field]: value }))
  }

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
    resolver: abrirSolicitacaoFormResolver,
    defaultValues: {
      processoId,
      pacienteId: paciente.id,
      especialidadeId: '',
      procedimentos: [],
      prestadorId: '',
      tipoAtendimento: 'CONSULTA',
      urgencia: 'BAIXA',
      acompanhanteNecessario: false,
      solicitacaoOrigemId: undefined,
      laudoAnexoIds: [],
      observacoesAbertura: '',
    },
  })

  const especialidadeId = watch('especialidadeId')
  const tipoAtendimento = watch('tipoAtendimento')
  const acompanhanteNecessario = watch('acompanhanteNecessario')

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
    if (tipoAtendimento !== 'EXAME') {
      setValue('procedimentos', [])
      clearErrors('procedimentos')
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
      relacao: 'OUTRO',
      telefone: '',
    } as AbrirSolicitacaoInput['acompanhante'])
  }, [acompanhanteNecessario, setValue, clearErrors])

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
        const subKey = key.split('.')[1] as 'nome' | 'cpf' | 'relacao' | 'telefone'
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

    return {
      ...values,
      processoId: processoId ?? values.processoId,
      pacienteId: paciente.id,
      pacienteCpf: undefined,
      especialidadeId: especialidadeIdValue,
      procedimentos: values.procedimentos ?? [],
      laudoAnexoIds: laudoAnexoIds.length > 0 ? laudoAnexoIds : (values.laudoAnexoIds ?? []),
      solicitacaoOrigemId:
        values.tipoAtendimento === 'RETORNO' ? values.solicitacaoOrigemId : undefined,
      acompanhante:
        values.acompanhanteNecessario && values.acompanhante
          ? ({
              nome: values.acompanhante.nome,
              relacao: 'OUTRO' as const,
              telefone: values.acompanhante.telefone,
            } as AbrirSolicitacaoInput['acompanhante'])
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

      await persistirDadosClinicosPosAbertura(
        response.data.solicitacaoId,
        processoId,
        soap
      )

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

      await persistirDadosClinicosPosAbertura(
        abrirResponse.data.solicitacaoId,
        processoId,
        soap
      )

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
          name="especialidadeId"
          control={control}
          render={({ field }) => (
            <Select
              id="especialidade-id"
              label="Especialidade"
              required={especialidadeObrigatoria}
              placeholder="Selecione a especialidade"
              options={especialidadeOptions}
              value={field.value ?? ''}
              onValueChange={field.onChange}
              disabled={isPending}
              error={errors.especialidadeId?.message}
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
              disabled={isPending || (especialidadeObrigatoria && !especialidadeId)}
              error={errors.prestadorId?.message}
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

      <SoapFieldsSection soap={soap} onChange={handleSoapChange} disabled={isPending} />

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
                  disabled={isPending}
                />
                <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  Paciente necessita de acompanhante (justificado no laudo)
                </span>
              </label>
            )}
          />

          {acompanhanteNecessario ? (
            <SolicitacaoAcompanhanteFields
              register={register}
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
