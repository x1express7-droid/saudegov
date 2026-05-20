'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { redefinirSenha } from '@saude/core-auth'

interface RedefinirSenhaFormProps {
  token: string
}

export function RedefinirSenhaForm({ token }: RedefinirSenhaFormProps) {
  const router = useRouter()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const response = await redefinirSenha({ token, novaSenha, confirmarSenha })

      if (!response.success) {
        setError(response.error)
        return
      }

      router.push('/login?senha=redefinida')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Nova senha
        <input
          type="password"
          name="novaSenha"
          autoComplete="new-password"
          required
          minLength={8}
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          disabled={isPending}
          className="rounded border border-neutral-300 px-3 py-2 text-base"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Confirmar nova senha
        <input
          type="password"
          name="confirmarSenha"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          disabled={isPending}
          className="rounded border border-neutral-300 px-3 py-2 text-base"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Salvando...' : 'Redefinir senha'}
      </button>
    </form>
  )
}
