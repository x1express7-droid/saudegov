'use client'

import { Card, Input, Select } from '@saude/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { VIAGEM_STATUS_CONFIG } from '../../components/viagem-status-badge'

const ALL_FILTER_VALUE = '__all__'
const TEXTO_DEBOUNCE_MS = 400

const statusOptions = [
  { value: ALL_FILTER_VALUE, label: 'Todos os status' },
  ...Object.entries(VIAGEM_STATUS_CONFIG).map(([value, config]) => ({
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

export function ViagemFiltros() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const statusParam = searchParams.get('status') ?? ''
  const protocoloParam = searchParams.get('protocolo') ?? ''
  const dataInicioParam = searchParams.get('dataSaidaInicio') ?? ''
  const dataFimParam = searchParams.get('dataSaidaFim') ?? ''

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
    }, TEXTO_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [protocoloInput, protocoloParam, pushParams])

  const statusValue =
    statusParam && statusParam in VIAGEM_STATUS_CONFIG ? statusParam : ALL_FILTER_VALUE

  return (
    <Card>
      <h2 className="mb-[var(--space-4)] text-[length:var(--text-sm)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Filtros
      </h2>
      <div className="grid gap-[var(--space-4)] md:grid-cols-2 lg:grid-cols-4">
        <Select
          id="filtro-status-viagem-tfd"
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
        <Input
          id="filtro-protocolo-viagem-tfd"
          label="Protocolo"
          placeholder="Buscar por protocolo..."
          value={protocoloInput}
          onChange={(event) => setProtocoloInput(event.target.value)}
          hint="Ex.: VGM-2026-000001"
        />
        <Input
          id="filtro-data-saida-inicio-viagem-tfd"
          label="Saída — de"
          type="date"
          value={dataInicioParam}
          onChange={(event) =>
            pushParams({ dataSaidaInicio: event.target.value || undefined })
          }
        />
        <Input
          id="filtro-data-saida-fim-viagem-tfd"
          label="Saída — até"
          type="date"
          value={dataFimParam}
          onChange={(event) =>
            pushParams({ dataSaidaFim: event.target.value || undefined })
          }
        />
      </div>
    </Card>
  )
}
