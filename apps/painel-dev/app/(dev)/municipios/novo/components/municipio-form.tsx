'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { criarMunicipio } from '../../../../../lib/actions/criar-municipio'
import {
  buildDomainPreview,
  criarMunicipioSchema,
  type CriarMunicipioInput,
} from '../../../../../lib/validators/municipio.schema'

const BRAZILIAN_UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

const MODULE_OPTIONS = [
  { key: 'tfd' as const, label: 'TFD — Tratamento Fora de Domicílio' },
  { key: 'regul' as const, label: 'Regulação' },
  { key: 'visa' as const, label: 'Vigilância Sanitária' },
  { key: 'farma' as const, label: 'Farmácia' },
  { key: 'ubs' as const, label: 'UBS' },
  { key: 'sment' as const, label: 'Saúde Mental' },
  { key: 'vacin' as const, label: 'Vacinação' },
]

const defaultModules: CriarMunicipioInput['modules'] = {
  saude: {
    tfd: false,
    regul: false,
    visa: false,
    farma: false,
    ubs: false,
    sment: false,
    vacin: false,
  },
}

const inputClassName =
  'rounded border border-neutral-300 px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900'

export function MunicipioForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successPassword, setSuccessPassword] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const form = useForm<CriarMunicipioInput>({
    resolver: zodResolver(criarMunicipioSchema),
    defaultValues: {
      nome: '',
      uf: 'SP',
      slug: '',
      tipoDominio: 'AUTOMATICO',
      domainCustom: '',
      adminNome: '',
      adminEmail: '',
      modules: defaultModules,
    },
  })

  const tipoDominio = form.watch('tipoDominio')
  const slug = form.watch('slug')
  const domainPreview = buildDomainPreview(slug)

  function applyFieldErrors(fieldErrors?: Partial<Record<string, string[]>>) {
    if (!fieldErrors) {
      return
    }
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        form.setError(field as keyof CriarMunicipioInput, { message: messages[0] })
      }
    }
  }

  function onSubmit(values: CriarMunicipioInput) {
    setServerError(null)
    startTransition(async () => {
      const response = await criarMunicipio(values)
      if (!response.success) {
        setServerError(response.error)
        applyFieldErrors(response.fieldErrors)
        return
      }
      setSuccessPassword(response.data.adminTempPassword)
    })
  }

  async function handleCopyPassword() {
    if (!successPassword) {
      return
    }
    try {
      await navigator.clipboard.writeText(successPassword)
      setCopyFeedback('Senha copiada.')
    } catch {
      setCopyFeedback('Não foi possível copiar. Selecione e copie manualmente.')
    }
  }

  function handleContinue() {
    router.push('/municipios')
  }

  if (successPassword) {
    return (
      <div
        role="alertdialog"
        aria-labelledby="senha-temporaria-titulo"
        className="flex flex-col gap-4 rounded-lg border border-amber-300 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/40"
      >
        <h2 id="senha-temporaria-titulo" className="text-lg font-semibold text-amber-900 dark:text-amber-100">
          Município criado com sucesso
        </h2>
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Anote esta senha — ela não será exibida novamente.
        </p>
        <p className="font-mono text-lg tracking-wide text-neutral-900 dark:text-neutral-100">
          {successPassword}
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Entregue ao administrador junto com o e-mail cadastrado. O primeiro acesso exige esta
          senha temporária.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleCopyPassword()}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Copiar senha
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-600"
          >
            Ir para municípios
          </button>
        </div>
        {copyFeedback && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{copyFeedback}</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {serverError && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Dados do município
        </legend>

        <label className="flex flex-col gap-1 text-sm">
          Nome do município
          <input type="text" className={inputClassName} {...form.register('nome')} />
          {form.formState.errors.nome && (
            <span className="text-red-600">{form.formState.errors.nome.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          UF
          <select className={inputClassName} {...form.register('uf')}>
            {BRAZILIAN_UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {form.formState.errors.uf && (
            <span className="text-red-600">{form.formState.errors.uf.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Slug
          <input type="text" className={inputClassName} placeholder="campo-grande-ms" {...form.register('slug')} />
          <span className="text-neutral-500">
            Domínio automático: <span className="font-mono">{domainPreview}</span>
          </span>
          {form.formState.errors.slug && (
            <span className="text-red-600">{form.formState.errors.slug.message}</span>
          )}
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Domínio de acesso
        </legend>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            value="AUTOMATICO"
            {...form.register('tipoDominio')}
            className="h-4 w-4"
          />
          Subdomínio automático ({domainPreview})
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="radio" value="CUSTOM" {...form.register('tipoDominio')} className="h-4 w-4" />
          Domínio próprio (.gov.br ou outro)
        </label>

        {tipoDominio === 'CUSTOM' && (
          <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <label className="flex flex-col gap-1 text-sm">
              Domínio customizado
              <input
                type="text"
                className={inputClassName}
                placeholder="saude.municipio.ms.gov.br"
                {...form.register('domainCustom')}
              />
              {form.formState.errors.domainCustom && (
                <span className="text-red-600">{form.formState.errors.domainCustom.message}</span>
              )}
            </label>
            <div className="text-sm text-neutral-700 dark:text-neutral-300">
              <p className="font-medium">Instruções para o TI do município</p>
              <p className="mt-1">
                Antes de ativar o acesso, o TI do município deve criar um registro{' '}
                <strong>CNAME</strong> no DNS do domínio informado, apontando para a plataforma
                SaúdeMunic (<span className="font-mono">saudemunic.com.br</span> ou o destino
                indicado pela equipe saudegov). Após a propagação do DNS, o domínio poderá ser
                validado no painel.
              </p>
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Primeiro administrador
        </legend>

        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input type="text" className={inputClassName} {...form.register('adminNome')} />
          {form.formState.errors.adminNome && (
            <span className="text-red-600">{form.formState.errors.adminNome.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input type="email" className={inputClassName} {...form.register('adminEmail')} />
          {form.formState.errors.adminEmail && (
            <span className="text-red-600">{form.formState.errors.adminEmail.message}</span>
          )}
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Módulos do sistema de saúde
        </legend>
        {MODULE_OPTIONS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...form.register(`modules.saude.${key}`)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isPending ? 'Criando município...' : 'Criar município'}
      </button>
    </form>
  )
}
