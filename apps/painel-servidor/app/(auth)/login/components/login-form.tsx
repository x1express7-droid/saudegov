'use client'

import { Alert, Button, Input } from '@saude/ui'
import { useState, useTransition } from 'react'
import { signIn } from '@saude/core-auth/client'

const GENERIC_ERROR = 'E-mail ou senha inválidos.'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
          redirectTo: '/dashboard',
        })

        if (result?.error) {
          setError(GENERIC_ERROR)
          return
        }

        window.location.href = '/dashboard'
      } catch {
        setError(GENERIC_ERROR)
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-[var(--space-4)]"
      noValidate
    >
      {error ? (
        <Alert variant="error" titulo="Não foi possível entrar">
          {error}
        </Alert>
      ) : null}

      <Input
        id="login-email"
        label="E-mail"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={isPending}
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
        disabled={isPending}
      />

      <Button type="submit" variant="primary" className="w-full" loading={isPending}>
        {isPending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
