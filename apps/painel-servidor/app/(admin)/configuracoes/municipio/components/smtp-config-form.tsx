'use client'

import { atualizarSmtpConfig } from '../../../../../lib/actions/municipio'
import type { SmtpConfigFormValues } from '../../../../../lib/utils/parse-settings'
import { Button, Card, Input, Spinner, cn } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface SmtpConfigFormProps {
  initial: SmtpConfigFormValues
}

export function SmtpConfigForm({ initial }: SmtpConfigFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)

  const [smtpCustomEnabled, setSmtpCustomEnabled] = useState(initial.smtpCustomEnabled)
  const [smtpHost, setSmtpHost] = useState(initial.smtpHost)
  const [smtpPort, setSmtpPort] = useState(String(initial.smtpPort))
  const [smtpUser, setSmtpUser] = useState(initial.smtpUser)
  const [smtpFrom, setSmtpFrom] = useState(initial.smtpFrom)
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpSecure, setSmtpSecure] = useState(initial.smtpSecure)
  const [smtpPasswordConfigured, setSmtpPasswordConfigured] = useState(
    initial.smtpPasswordConfigured
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    startTransition(async () => {
      const portParsed = Number.parseInt(smtpPort.trim(), 10)

      const res = await atualizarSmtpConfig(
        smtpCustomEnabled
          ? {
              smtpCustomEnabled: true,
              smtpHost: smtpHost.trim(),
              smtpPort: portParsed,
              smtpUser: smtpUser.trim(),
              smtpFrom: smtpFrom.trim(),
              smtpPassword: smtpPassword.trim() === '' ? undefined : smtpPassword,
              smtpSecure,
            }
          : { smtpCustomEnabled: false }
      )

      if (!res.success) {
        setError(res.error)
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors as Record<string, string[]>)
        }
        return
      }

      if (smtpPassword.trim() !== '') {
        setSmtpPasswordConfigured(true)
      }
      setSmtpPassword('')
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <Card className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]">
      <div>
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          SMTP do município
        </h2>
        <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Servidor de saída para envio de e-mails do TFD. Com o toggle desativado, usa-se o SMTP
          padrão da plataforma.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-[var(--space-4)]">
        <label
          className={cn(
            'flex cursor-pointer items-start gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-3)]',
            smtpCustomEnabled && 'border-[var(--color-primary)] bg-[var(--color-primary-light)]',
            isPending && 'cursor-not-allowed opacity-60'
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
            checked={smtpCustomEnabled}
            onChange={(e) => setSmtpCustomEnabled(e.target.checked)}
            disabled={isPending}
          />
          <span className="flex flex-col gap-[var(--space-1)]">
            <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
              Usar SMTP customizado
            </span>
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Quando ativo, as credenciais abaixo substituem o SMTP da plataforma para este
              município.
            </span>
          </span>
        </label>

        {smtpCustomEnabled ? (
          <>
            <Input
              label="Host SMTP"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.municipio.gov.br"
              error={fieldErrors.smtpHost?.[0]}
              disabled={isPending}
              autoComplete="off"
            />

            <Input
              label="Porta"
              type="number"
              min={1}
              max={65535}
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              placeholder="587"
              error={fieldErrors.smtpPort?.[0]}
              disabled={isPending}
            />

            <Input
              label="Usuário SMTP"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="usuario@smtp"
              error={fieldErrors.smtpUser?.[0]}
              disabled={isPending}
              autoComplete="off"
            />

            <Input
              label="Remetente (From)"
              type="email"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="saude@municipio.gov.br"
              error={fieldErrors.smtpFrom?.[0]}
              disabled={isPending}
            />

            <Input
              label="Senha SMTP"
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder="Senha SMTP"
              error={fieldErrors.smtpPassword?.[0]}
              disabled={isPending}
              hint={
                smtpPasswordConfigured
                  ? 'Senha já configurada. Deixe em branco para manter; informe um novo valor para substituir.'
                  : 'Obrigatória na primeira ativação do SMTP customizado.'
              }
              autoComplete="new-password"
            />

            <label
              className={cn(
                'flex cursor-pointer items-start gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-3)]',
                smtpSecure && 'border-[var(--color-primary)] bg-[var(--color-primary-light)]',
                isPending && 'cursor-not-allowed opacity-60'
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-primary)]"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                disabled={isPending}
              />
              <span className="flex flex-col gap-[var(--space-1)]">
                <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                  Conexão segura (TLS)
                </span>
                <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Recomendado para portas 465 ou 587 com STARTTLS.
                </span>
              </span>
            </label>
          </>
        ) : null}

        {error ? (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-success)]">
            Configuração SMTP salva.
          </p>
        ) : null}

        <Button type="submit" variant="primary" disabled={isPending} className="self-start">
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Salvando...
            </>
          ) : (
            'Salvar configuração SMTP'
          )}
        </Button>
      </form>
    </Card>
  )
}
