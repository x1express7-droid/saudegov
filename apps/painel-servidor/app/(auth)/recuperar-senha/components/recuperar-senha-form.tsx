'use client'

import { useState, useTransition } from 'react'
import { solicitarRecuperacaoSenha } from '@saude/core-auth'

const SUCCESS_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.'

export function RecuperarSenhaForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const response = await solicitarRecuperacaoSenha({ email })

      if (!response.success) {
        setError(response.error)
        return
      }

      setSuccess(true)
    })
  }

  if (success) {
    return (
      <p className="max-w-sm text-center text-sm text-neutral-700" role="status">
        {SUCCESS_MESSAGE}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          className="rounded border border-neutral-300 px-3 py-2 text-base"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Enviando...' : 'Enviar link de recuperação'}
      </button>
    </form>
  )
}
