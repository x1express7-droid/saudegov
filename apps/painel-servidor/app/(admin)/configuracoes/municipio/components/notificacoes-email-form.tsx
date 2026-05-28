'use client'

import { atualizarNotificacoesEmailConfig } from '../../../../../lib/actions/municipio'
import type { NotificacoesEmailFormValues } from '../../../../../lib/utils/parse-settings'
import { Button, Card, Input, Spinner, cn } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface NotificacoesEmailFormProps {
  initial: NotificacoesEmailFormValues
}

export function NotificacoesEmailForm({ initial }: NotificacoesEmailFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(
    initial.emailNotificationsEnabled
  )
  const [notificationEmail, setNotificationEmail] = useState(initial.notificationEmail)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    startTransition(async () => {
      const res = await atualizarNotificacoesEmailConfig({
        emailNotificationsEnabled,
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
      router.refresh()
    })
  }

  return (
    <Card className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]">
      <div>
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          Notificações por e-mail
        </h2>
        <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Controle o envio de alertas por e-mail do módulo TFD e o endereço institucional usado como
          remetente padrão.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-[var(--space-4)]">
        <label
          className={cn(
            'flex cursor-pointer items-start gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-3)]',
            emailNotificationsEnabled &&
              'border-[var(--color-primary)] bg-[var(--color-primary-light)]',
            isPending && 'cursor-not-allowed opacity-60'
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
            checked={emailNotificationsEnabled}
            onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
            disabled={isPending}
          />
          <span className="flex flex-col gap-[var(--space-1)]">
            <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
              Enviar notificações por e-mail
            </span>
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Quando desativado, apenas notificações in-app são disparadas; a fila de e-mail não é
              processada para este município.
            </span>
          </span>
        </label>

        <Input
          label="E-mail de notificação"
          type="email"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          placeholder="saude@municipio.gov.br"
          error={fieldErrors.notificationEmail?.[0]}
          disabled={isPending}
          hint="Remetente padrão quando não houver SMTP customizado ou campo From do SMTP."
        />

        {error ? (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-success)]">
            Configuração de notificações salva.
          </p>
        ) : null}

        <Button type="submit" variant="primary" disabled={isPending} className="self-start">
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Salvando...
            </>
          ) : (
            'Salvar notificações por e-mail'
          )}
        </Button>
      </form>
    </Card>
  )
}
