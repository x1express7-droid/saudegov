'use client'

import { Card, Input, Select } from '@saude/ui'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { VIAGEM_STATUS_CONFIG } from '../../components/viagem-status-badge'

// BLOCO-10-VIAGENS
const ALL_FILTER_VALUE = '__all__'
const TEXTO_DEBOUNCE_MS = 400

const statusOptions = [
  { value: ALL_FILTER_VALUE, label: 'Todos' },
  ...Object.entries(VIAGEM_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  })),
]

export interface ViagemFiltrosProps {
  motoristas: Array<{ id: string; nome: string }>
  veiculos: Array<{ id: string; placa: string; modelo: string }>
}

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

export function ViagemFiltros({ motoristas, veiculos }: ViagemFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const statusParam = searchParams.get('status') ?? ''
  const protocoloParam = searchParams.get('protocolo') ?? ''
  const dataInicioParam = searchParams.get('dataSaidaInicio') ?? ''
  const dataFimParam = searchParams.get('dataSaidaFim') ?? ''
  const motoristaIdParam = searchParams.get('motoristaId') ?? ''
  const veiculoIdParam = searchParams.get('veiculoId') ?? ''

  const [protocoloInput, setProtocoloInput] = useState(protocoloParam)
  const [avancadosAbertos, setAvancadosAbertos] = useState(
    Boolean(dataInicioParam || dataFimParam || motoristaIdParam || veiculoIdParam)
  )

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

  const motoristaOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: 'Todos os motoristas' },
      ...motoristas.map((motorista) => ({
        value: motorista.id,
        label: motorista.nome,
      })),
    ],
    [motoristas]
  )

  const veiculoOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: 'Todos os veículos' },
      ...veiculos.map((veiculo) => ({
        value: veiculo.id,
        label: `${veiculo.placa} — ${veiculo.modelo}`,
      })),
    ],
    [veiculos]
  )

  const motoristaValue =
    motoristaIdParam && motoristas.some((item) => item.id === motoristaIdParam)
      ? motoristaIdParam
      : ALL_FILTER_VALUE

  const veiculoValue =
    veiculoIdParam && veiculos.some((item) => item.id === veiculoIdParam)
      ? veiculoIdParam
      : ALL_FILTER_VALUE

  const temFiltrosAtivos =
    (statusParam !== '' && statusParam in VIAGEM_STATUS_CONFIG) ||
    protocoloParam.trim() !== '' ||
    dataInicioParam !== '' ||
    dataFimParam !== '' ||
    motoristaIdParam !== '' ||
    veiculoIdParam !== ''

  function handleLimpar() {
    setProtocoloInput('')
    setAvancadosAbertos(false)
    router.push(pathname)
  }

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-4)]">
        <div className="grid gap-[var(--space-4)] md:grid-cols-2">
          {/*
            BLOCO-10-VIAGENS: filtro por paciente omitido — ViagemTfdListItem
            não expõe nomes de passageiros, apenas totalPassageiros.
          */}
          <Select
            id="filtro-status-viagem-tfd"
            label="Status"
            placeholder="Todos"
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
            label="Buscar por protocolo"
            placeholder="Ex.: VGM-2026-000001"
            value={protocoloInput}
            onChange={(event) => setProtocoloInput(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <button
            type="button"
            className="inline-flex items-center gap-[var(--space-1)] text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
            onClick={() => setAvancadosAbertos((current) => !current)}
          >
            Filtros avançados
            {avancadosAbertos ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>

          {temFiltrosAtivos ? (
            <button
              type="button"
              className="text-[length:var(--text-xs)] text-[var(--color-primary)] hover:underline"
              onClick={handleLimpar}
            >
              Limpar
            </button>
          ) : null}
        </div>

        {avancadosAbertos ? (
          <div className="grid gap-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)] md:grid-cols-2">
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
            <Select
              id="filtro-motorista-viagem-tfd"
              label="Motorista"
              placeholder="Todos os motoristas"
              options={motoristaOptions}
              value={motoristaValue}
              onValueChange={(value) =>
                pushParams({
                  motoristaId: value === ALL_FILTER_VALUE ? undefined : value,
                })
              }
            />
            <Select
              id="filtro-veiculo-viagem-tfd"
              label="Veículo"
              placeholder="Todos os veículos"
              options={veiculoOptions}
              value={veiculoValue}
              onValueChange={(value) =>
                pushParams({
                  veiculoId: value === ALL_FILTER_VALUE ? undefined : value,
                })
              }
            />
          </div>
        ) : null}
      </div>
    </Card>
  )
}
