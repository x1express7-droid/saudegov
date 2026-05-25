'use client'

import { Input } from '@saude/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const NOME_DEBOUNCE_MS = 400

function buildQueryString(
  current: URLSearchParams,
  patch: Record<string, string | undefined>
): string {
  const next = new URLSearchParams(current.toString())

  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  }

  next.delete('page')

  return next.toString()
}

export function PacientesVinculadosFiltro() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const nomeParam = searchParams.get('nome') ?? ''
  const [nomeInput, setNomeInput] = useState(nomeParam)

  useEffect(() => {
    setNomeInput(nomeParam)
  }, [nomeParam])

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const query = buildQueryString(searchParams, patch)
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    const trimmed = nomeInput.trim()
    const normalizedUrl = nomeParam.trim()

    if (trimmed === normalizedUrl) {
      return
    }

    const timer = window.setTimeout(() => {
      pushParams({ nome: trimmed || undefined })
    }, NOME_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [nomeInput, nomeParam, pushParams])

  return (
    <Input
      id="filtro-nome-paciente-tfd"
      label="Buscar por nome"
      placeholder="Digite parte do nome do paciente..."
      value={nomeInput}
      onChange={(event) => setNomeInput(event.target.value)}
      hint="Filtra a lista de pacientes já vinculados ao município."
    />
  )
}
