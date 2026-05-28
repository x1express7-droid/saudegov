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
  const [municipioOrigemCidade, setMunicipioOrigemCidade] = useState(
    initialValores.municipioOrigemCidade
  )
  const [municipioOrigemEstado, setMunicipioOrigemEstado] = useState(
    initialValores.municipioOrigemEstado
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    startTransition(async () => {
      const res = await atualizarDadosMunicipio({
        cnpj: cnpj || undefined,
        timezone,
        municipioOrigemCidade: municipioOrigemCidade || undefined,
        municipioOrigemEstado: municipioOrigemEstado || undefined,
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

        <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
          <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
            Município de origem (TFD)
          </h3>
          <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Cidade sede do gestor usada para calcular a distância mínima de 50 km na aprovação de
            solicitações TFD. Informe cidade e UF juntos; se omitir, o gestor deverá informar a
            distância manualmente na decisão.
          </p>
          <div className="mt-[var(--space-3)] grid gap-[var(--space-3)] sm:grid-cols-[1fr_120px]">
            <Input
              label="Cidade de origem"
              value={municipioOrigemCidade}
              onChange={(e) => setMunicipioOrigemCidade(e.target.value)}
              placeholder="Ex.: Campo Grande"
              error={fieldErrors.municipioOrigemCidade?.[0]}
              disabled={isPending}
            />
            <Input
              label="UF"
              value={municipioOrigemEstado}
              onChange={(e) => setMunicipioOrigemEstado(e.target.value.toUpperCase())}
              placeholder="MS"
              maxLength={2}
              error={fieldErrors.municipioOrigemEstado?.[0]}
              disabled={isPending}
            />
          </div>
        </div>

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
