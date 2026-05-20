'use client'

import { atualizarDadosMunicipio } from '../../../../../lib/actions/municipio'
import { BRAZIL_TIMEZONE_OPTIONS } from '../../../../../lib/constants/brazil-timezones'
import type { DadosMunicipioFormValues } from '../../../../../lib/utils/parse-settings'
import type { BrazilTimezone } from '@saude/validators'
import { Button, Card, Input, Select, Spinner } from '@saude/ui'
import { useState, useTransition } from 'react'

interface DadosMunicipioFormProps {
  name: string
  slug: string
  initialValores: DadosMunicipioFormValues
}

export function DadosMunicipioForm({ name, slug, initialValores }: DadosMunicipioFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)

  const [cnpj, setCnpj] = useState(initialValores.cnpj)
  const [timezone, setTimezone] = useState<BrazilTimezone>(initialValores.timezone)
  const [notificationEmail, setNotificationEmail] = useState(initialValores.notificationEmail)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    startTransition(async () => {
      const res = await atualizarDadosMunicipio({
        cnpj: cnpj || undefined,
        timezone,
        notificationEmail: notificationEmail || undefined,
      })

      if (!res.success) {
        setError(res.error)
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors as Record<string, string[]>)
        }
        return
      }

      setSuccess(true)
    })
  }

  return (
    <Card className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]">
      <div>
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          Dados do município
        </h2>
        <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Dados institucionais tratados conforme LGPD. Nome e identificador (slug) são definidos
          pela equipe saudegov no Painel Dev.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-[var(--space-4)]">
        <Input label="Nome do município" value={name} disabled hint="Somente leitura." />
        <Input
          label="Slug (identificador)"
          value={slug}
          disabled
          hint="Usado em subdomínios e URLs. Editável apenas no Painel Dev."
        />

        <Input
          label="CNPJ"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="00.000.000/0000-00"
          error={fieldErrors.cnpj?.[0]}
          disabled={isPending}
          hint="Opcional. Apenas dígitos ou formato mascarado."
        />

        <Select
          label="Fuso horário"
          options={BRAZIL_TIMEZONE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={timezone}
          onValueChange={(v) => setTimezone(v as BrazilTimezone)}
          error={fieldErrors.timezone?.[0]}
          required
          disabled={isPending}
        />

        <Input
          label="E-mail de notificação"
          type="email"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          placeholder="saude@municipio.gov.br"
          error={fieldErrors.notificationEmail?.[0]}
          disabled={isPending}
          hint="Opcional. E-mail institucional para alertas do sistema."
        />

        {error ? (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-success)]">
            Dados salvos com sucesso.
          </p>
        ) : null}

        <Button type="submit" variant="primary" disabled={isPending} className="self-start">
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Salvando...
            </>
          ) : (
            'Salvar dados do município'
          )}
        </Button>
      </form>
    </Card>
  )
}
