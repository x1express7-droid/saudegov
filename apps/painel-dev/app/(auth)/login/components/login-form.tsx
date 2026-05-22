'use client'

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
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/dashboard" />

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!canSubmit}
          className="rounded border border-neutral-300 px-3 py-2 text-base"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={!canSubmit}
          className="rounded border border-neutral-300 px-3 py-2 text-base"
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {canSubmit ? 'Entrar' : 'Carregando...'}
      </button>
    </form>
  )
}
