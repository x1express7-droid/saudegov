'use client'

import type { TfdStatus, TfdUrgencia } from '@saude/ui'
import {
  Card,
  Input,
  Select,
  TFD_STATUS_CONFIG,
  TFD_URGENCIA_CONFIG,
} from '@saude/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const ALL_FILTER_VALUE = '__all__'
const PROTOCOLO_DEBOUNCE_MS = 400

const statusOptions = [
  { value: ALL_FILTER_VALUE, label: 'Todos os status' },
  ...Object.entries(TFD_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  })),
]

const urgenciaOptions = [
  { value: ALL_FILTER_VALUE, label: 'Todas as urgências' },
  ...Object.entries(TFD_URGENCIA_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  })),
]

function buildQueryString(
  current: URLSearchParams,
  patch: Record<string, string | undefined>,
  options?: { resetPage?: boolean }
): string {
  const next = new URLSearchParams(current.toString())

  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  }

  if (options?.resetPage !== false && !('page' in patch)) {
    next.delete('page')
  }

  return next.toString()
}

export function SolicitacaoFiltros() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const statusParam = searchParams.get('status') ?? ''
  const urgenciaParam = searchParams.get('urgencia') ?? ''
  const protocoloParam = searchParams.get('protocolo') ?? ''

  const [protocoloInput, setProtocoloInput] = useState(protocoloParam)

  useEffect(() => {
    setProtocoloInput(protocoloParam)
  }, [protocoloParam])

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>, options?: { resetPage?: boolean }) => {
      const query = buildQueryString(searchParams, patch, options)
      const href = query ? `${pathname}?${query}` : pathname
      router.push(href)
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    const trimmed = protocoloInput.trim()
    const normalizedUrl = protocoloParam.trim()

    if (trimmed === normalizedUrl) {
      return
    }

    const timer = window.setTimeout(() => {
      pushParams({ protocolo: trimmed || undefined })
    }, PROTOCOLO_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [protocoloInput, protocoloParam, pushParams])

  const statusValue =
    statusParam && statusParam in TFD_STATUS_CONFIG
      ? (statusParam as TfdStatus)
      : ALL_FILTER_VALUE

  const urgenciaValue =
    urgenciaParam && urgenciaParam in TFD_URGENCIA_CONFIG
      ? (urgenciaParam as TfdUrgencia)
      : ALL_FILTER_VALUE

  return (
    <Card>
      <div className="grid gap-[var(--space-4)] md:grid-cols-3">
        <Select
          id="filtro-status-tfd"
          label="Status"
          placeholder="Todos os status"
          options={statusOptions}
          value={statusValue}
          onValueChange={(value) =>
            pushParams({
              status: value === ALL_FILTER_VALUE ? undefined : value,
            })
          }
        />
        <Select
          id="filtro-urgencia-tfd"
          label="Urgência"
          placeholder="Todas as urgências"
          options={urgenciaOptions}
          value={urgenciaValue}
          onValueChange={(value) =>
            pushParams({
              urgencia: value === ALL_FILTER_VALUE ? undefined : value,
            })
          }
        />
        <Input
          id="filtro-protocolo-tfd"
          label="Protocolo"
          placeholder="Buscar por protocolo..."
          value={protocoloInput}
          onChange={(event) => setProtocoloInput(event.target.value)}
          hint="Ex.: 2025-SAUDE-TFD-000001"
        />
      </div>
    </Card>
  )
}
