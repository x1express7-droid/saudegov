'use client'

import { Button, Card, Input, Select } from '@saude/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useTransition } from 'react'

const ALL_FILTER_VALUE = '__all__'

const statusOptions = [
  { value: ALL_FILTER_VALUE, label: 'Todos os status' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
]

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

function buildMesAnoOptions(): Array<{ value: string; label: string }> {
  const options = [{ value: ALL_FILTER_VALUE, label: 'Todos os períodos' }]
  const hoje = new Date()

  for (let offset = 0; offset < 12; offset += 1) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1)
    const value = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    const label = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }

  return options
}

export function PrestacaoFiltros() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const mesAnoOptions = useMemo(() => buildMesAnoOptions(), [])

  const statusParam = searchParams.get('status') ?? ''
  const statusValue =
    statusParam && statusOptions.some((o) => o.value === statusParam)
      ? statusParam
      : ALL_FILTER_VALUE

  const mesParam = searchParams.get('mes') ?? ''
  const mesValue =
    mesParam && mesAnoOptions.some((o) => o.value === mesParam) ? mesParam : ALL_FILTER_VALUE

  const pacienteValue = searchParams.get('paciente') ?? ''

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const query = buildQueryString(searchParams, patch)
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname)
      })
    },
    [pathname, router, searchParams]
  )

  const temFiltrosAtivos =
    statusValue !== ALL_FILTER_VALUE || mesValue !== ALL_FILTER_VALUE || pacienteValue.length > 0

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-[var(--space-4)]">
        {/* BLOCO-5: busca por paciente na lista carregada */}
        <div className="min-w-[12rem] flex-1">
          <Input
            id="filtro-paciente-prestacao"
            label="Paciente"
            placeholder="Buscar por nome do paciente..."
            value={pacienteValue}
            disabled={isPending}
            onChange={(event) => pushParams({ paciente: event.target.value || undefined })}
          />
        </div>

        <div className="min-w-[12rem] flex-1">
          <Select
            id="filtro-mes-prestacao"
            label="Período (mês/ano)"
            placeholder="Todos os períodos"
            options={mesAnoOptions}
            value={mesValue}
            disabled={isPending}
            onValueChange={(value) =>
              pushParams({
                mes: value === ALL_FILTER_VALUE ? undefined : value,
              })
            }
          />
        </div>

        <div className="min-w-[12rem] flex-1">
          <Select
            id="filtro-status-prestacao"
            label="Status da prestação"
            placeholder="Todos os status"
            options={statusOptions}
            value={statusValue}
            disabled={isPending}
            onValueChange={(value) =>
              pushParams({
                status: value === ALL_FILTER_VALUE ? undefined : value,
              })
            }
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={isPending || !temFiltrosAtivos}
          onClick={() =>
            pushParams({
              status: undefined,
              mes: undefined,
              paciente: undefined,
            })
          }
        >
          Limpar filtros
        </Button>
      </div>
    </Card>
  )
}
