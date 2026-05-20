'use client'

import { atualizarCadsusConfig } from '../../../../../lib/actions/municipio'
import type { CadsusConfigFormValues } from '../../../../../lib/utils/parse-settings'
import { Button, Card, Input, Spinner, cn } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface CadsusConfigFormProps {
  initial: CadsusConfigFormValues
}

export function CadsusConfigForm({ initial }: CadsusConfigFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)

  const [cadsusEnabled, setCadsusEnabled] = useState(initial.cadsusEnabled)
  const [cadsusToken, setCadsusToken] = useState('')
  const [tokenSuffix, setTokenSuffix] = useState(initial.tokenSuffix)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    startTransition(async () => {
      const res = await atualizarCadsusConfig({
        cadsusEnabled,
        cadsusToken: cadsusToken.trim() === '' ? undefined : cadsusToken,
      })

      if (!res.success) {
        setError(res.error)
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors as Record<string, string[]>)
        }
        return
      }

      if (cadsusToken.trim().length >= 4) {
        setTokenSuffix(cadsusToken.trim().slice(-4))
      }
      setCadsusToken('')
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <Card className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]">
      <div>
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          Integração CADSUS
        </h2>
        <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          A integração real com o CADSUS/RNDS será configurada pela equipe saudegov.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-[var(--space-4)]">
        <label
          className={cn(
            'flex cursor-pointer items-start gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-3)]',
            cadsusEnabled && 'border-[var(--color-primary)] bg-[var(--color-primary-light)]',
            isPending && 'cursor-not-allowed opacity-60'
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
            checked={cadsusEnabled}
            onChange={(e) => setCadsusEnabled(e.target.checked)}
            disabled={isPending}
          />
          <span className="flex flex-col gap-[var(--space-1)]">
            <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
              Usar busca por CNS (stub de desenvolvimento)
            </span>
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Quando ativo, o módulo TFD poderá consultar o stub CADSUS por CNS (Sprint 1.3+).
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-[var(--space-2)]">
          <Input
            label="Token RNDS (opcional)"
            type="password"
            value={cadsusToken}
            onChange={(e) => setCadsusToken(e.target.value)}
            placeholder="Token RNDS (opcional)"
            error={fieldErrors.cadsusToken?.[0]}
            disabled={isPending}
            hint={
              tokenSuffix
                ? `Token já configurado (final …${tokenSuffix}). Deixe em branco para manter; informe um novo valor para substituir.`
                : 'Placeholder para integração RNDS real (Sprint 2.2). Sem efeito no stub atual.'
            }
            autoComplete="off"
          />
        </div>

        {error ? (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-success)]">
            Configuração CADSUS salva.
          </p>
        ) : null}

        <Button type="submit" variant="primary" disabled={isPending} className="self-start">
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Salvando...
            </>
          ) : (
            'Salvar configuração CADSUS'
          )}
        </Button>
      </form>
    </Card>
  )
}
