'use client'

import { Alert, Button, Input } from '@saude/ui'
import { useAuthCsrfToken } from '@saude/core-auth/client'
import { useState } from 'react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const csrfToken = useAuthCsrfToken()
  const canSubmit = Boolean(csrfToken)

  return (
    <form
      method="post"
      action="/api/auth/callback/credentials"
      className="flex w-full max-w-sm flex-col gap-[var(--space-4)]"
      noValidate
    >
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/dashboard" />

      <Input
        id="login-email"
        label="E-mail"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={!canSubmit}
        placeholder="seu.email@municipio.gov.br"
      />

      <Input
        id="login-password"
        label="Senha"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={!canSubmit}
      />

      <Button type="submit" variant="primary" className="w-full" disabled={!canSubmit}>
        {canSubmit ? 'Entrar' : 'Carregando...'}
      </Button>
    </form>
  )
}
