'use client'

import { Card, Input, Select, TFD_URGENCIA_CONFIG, Button, type TfdUrgencia } from '@saude/ui'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { PROCESSO_STATUS_CONFIG } from '../../components/processo-status-badge'

// BLOCO-8-PROCESSOS
const ALL_FILTER_VALUE = '__all__'
const TEXTO_DEBOUNCE_MS = 400

const statusProcessoOptions = [
  { value: ALL_FILTER_VALUE, label: 'Todos os status' },
  ...Object.entries(PROCESSO_STATUS_CONFIG).map(([value, config]) => ({
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

export function ProcessoFiltros() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const statusParam = searchParams.get('statusProcesso') ?? ''
  const urgenciaParam = searchParams.get('urgencia') ?? ''
  const pacienteParam = searchParams.get('pacienteNome') ?? ''
  const protocoloParam = searchParams.get('protocolo') ?? ''
  const dataInicioParam = searchParams.get('dataInicio') ?? ''
  const dataFimParam = searchParams.get('dataFim') ?? ''

  const [pacienteInput, setPacienteInput] = useState(pacienteParam)
  const [protocoloInput, setProtocoloInput] = useState(protocoloParam)
  const [avancadosAbertos, setAvancadosAbertos] = useState(
    Boolean(dataInicioParam || dataFimParam)
  )

  useEffect(() => {
    setPacienteInput(pacienteParam)
  }, [pacienteParam])

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
    const trimmed = pacienteInput.trim()
    const normalizedUrl = pacienteParam.trim()

    if (trimmed === normalizedUrl) {
      return
    }

    const timer = window.setTimeout(() => {
      pushParams({ pacienteNome: trimmed || undefined })
    }, TEXTO_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [pacienteInput, pacienteParam, pushParams])

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
    statusParam && statusParam in PROCESSO_STATUS_CONFIG ? statusParam : ALL_FILTER_VALUE

  const urgenciaValue =
    urgenciaParam && urgenciaParam in TFD_URGENCIA_CONFIG
      ? (urgenciaParam as TfdUrgencia)
      : ALL_FILTER_VALUE

  const temFiltrosAvancados = Boolean(dataInicioParam || dataFimParam)

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-4)]">
        <div className="grid gap-[var(--space-4)] md:grid-cols-2 lg:grid-cols-4">
          <Select
            id="filtro-status-processo-tfd"
            label="Status"
            placeholder="Todos os status"
            options={statusProcessoOptions}
            value={statusValue}
            onValueChange={(value) =>
              pushParams({
                statusProcesso: value === ALL_FILTER_VALUE ? undefined : value,
              })
            }
          />
          <Select
            id="filtro-urgencia-processo-tfd"
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
            id="filtro-paciente-processo-tfd"
            label="Paciente"
            placeholder="Buscar por nome..."
            value={pacienteInput}
            onChange={(event) => setPacienteInput(event.target.value)}
          />
          <Input
            id="filtro-protocolo-processo-tfd"
            label="Protocolo"
            placeholder="Buscar por protocolo..."
            value={protocoloInput}
            onChange={(event) => setProtocoloInput(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <Button
            type="button"
            variant="outline"
            className="min-h-[36px]"
            onClick={() => setAvancadosAbertos((current) => !current)}
          >
            Filtros avançados
            {temFiltrosAvancados ? (
              <span className="ml-1 rounded-full bg-[var(--color-primary-light)] px-1.5 text-[length:var(--text-xs)] text-[var(--color-primary)]">
                ativos
              </span>
            ) : null}
            {avancadosAbertos ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {avancadosAbertos ? (
          <div className="grid gap-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)] md:grid-cols-2 lg:max-w-xl">
            <Input
              id="filtro-data-inicio-processo-tfd"
              label="Data início"
              type="date"
              value={dataInicioParam}
              onChange={(event) =>
                pushParams({ dataInicio: event.target.value || undefined })
              }
            />
            <Input
              id="filtro-data-fim-processo-tfd"
              label="Data fim"
              type="date"
              value={dataFimParam}
              onChange={(event) => pushParams({ dataFim: event.target.value || undefined })}
            />
          </div>
        ) : null}
      </div>
    </Card>
  )
}
