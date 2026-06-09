'use client'

import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'
import { Card, cn } from '@saude/ui'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import {
  VIAGEM_STATUS_CONFIG,
  type ViagemStatusValue,
} from '../../components/viagem-status-badge'
import {
  compareDataSaidaAsc,
  formatDataSaidaCurta,
  labelRota,
  labelVeiculoPlaca,
  motoristaNaoAlocado,
  viagemDetalheHref,
} from './viagem-lista-utils'
import { getViagemTemporalBadge } from './viagem-temporal-badge'

// BLOCO-10-VIAGENS
const KANBAN_STATUS_ORDER = [
  'PLANEJADA',
  'CONFIRMADA',
  'EM_ANDAMENTO',
  'CONCLUIDA',
] as const satisfies readonly ViagemStatusValue[]

const KANBAN_CANCELADAS = ['CANCELADA'] as const satisfies readonly ViagemStatusValue[]

type ViagemBadgeColor = (typeof VIAGEM_STATUS_CONFIG)[ViagemStatusValue]['color']

const STATUS_COUNT_CLASSES: Record<ViagemBadgeColor, string> = {
  gray: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]',
  blue: 'bg-[var(--color-info-light)] text-[var(--color-info)]',
  cyan: 'bg-[var(--color-cyan-light)] text-[var(--color-cyan)]',
  emerald: 'bg-[var(--color-emerald-solid)] text-white',
  slate: 'bg-[var(--color-slate-solid)] text-white',
}

function statusCountClassName(color: ViagemBadgeColor, count: number): string {
  if (count === 0) {
    return 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
  }
  return STATUS_COUNT_CLASSES[color]
}

function labelVagas(item: ViagemTfdListItem): string {
  if (item.capacidadeVeiculo !== null) {
    return `${item.totalPassageiros}/${item.capacidadeVeiculo} vagas`
  }
  if (item.totalPassageiros > 0) {
    return String(item.totalPassageiros)
  }
  return '—'
}

export interface ViagemKanbanViewProps {
  items: ViagemTfdListItem[]
  mostrarCanceladas: boolean
}

export function ViagemKanbanView({ items, mostrarCanceladas }: ViagemKanbanViewProps) {
  const router = useRouter()

  const colunas = useMemo(() => {
    const statusList = mostrarCanceladas
      ? [...KANBAN_STATUS_ORDER, ...KANBAN_CANCELADAS]
      : [...KANBAN_STATUS_ORDER]

    return statusList.map((status) => ({
      status,
      items: items
        .filter((item) => item.status === status)
        .sort(compareDataSaidaAsc),
    }))
  }, [items, mostrarCanceladas])

  return (
    <div className="overflow-x-auto pb-[var(--space-2)]">
      <div className="flex min-w-max gap-[var(--space-4)]">
        {colunas.map((coluna) => {
          const statusConfig = VIAGEM_STATUS_CONFIG[coluna.status]
          const count = coluna.items.length

          return (
            <div
              key={coluna.status}
              className="flex w-52 shrink-0 flex-col gap-[var(--space-2)] lg:w-64"
            >
              <div className="flex items-center justify-between gap-[var(--space-2)] px-[var(--space-1)]">
                <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
                  {statusConfig.label}
                </h3>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[length:var(--text-xs)] font-bold',
                    statusCountClassName(statusConfig.color, count)
                  )}
                >
                  {count}
                </span>
              </div>

              <div className="min-h-64 rounded-[var(--radius-lg)] bg-[var(--color-bg)] p-[var(--space-2)]">
                {count === 0 ? (
                  <p className="flex min-h-64 items-center justify-center text-center text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
                    Nenhuma viagem
                  </p>
                ) : (
                  <div className="flex flex-col gap-[var(--space-2)]">
                    {coluna.items.map((item) => {
                      const detalheHref = viagemDetalheHref(item.id)
                      const temporalBadge = getViagemTemporalBadge(item.dataSaida, item.status)
                      const placa = labelVeiculoPlaca(item.veiculo)

                      return (
                        <Card
                          key={item.id}
                          bodyClassName="p-[var(--space-3)]"
                          className="cursor-pointer transition-shadow hover:shadow-md"
                          onClick={() => router.push(detalheHref)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              router.push(detalheHref)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-start justify-between gap-[var(--space-2)]">
                            <p className="min-w-0 truncate font-mono text-[length:var(--text-xs)] font-bold text-[var(--color-text)]">
                              {item.protocolo}
                            </p>
                            {temporalBadge}
                          </div>
                          <p className="mt-1 truncate text-[length:var(--text-sm)] text-[var(--color-text)]">
                            {labelRota(item)}
                          </p>
                          <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            {formatDataSaidaCurta(item.dataSaida)}
                            {item.horaSaida ? ` · ${item.horaSaida}` : ''}
                          </p>
                          <div className="mt-[var(--space-2)] flex items-center justify-between gap-[var(--space-2)]">
                            {placa ? (
                              <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                {placa}
                              </span>
                            ) : item.status === 'PLANEJADA' ? (
                              <span className="text-[length:var(--text-xs)] text-[var(--color-warning)]">
                                Sem veículo
                              </span>
                            ) : (
                              <span className="text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
                                —
                              </span>
                            )}
                            <span className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                              {labelVagas(item)}
                            </span>
                          </div>
                          {motoristaNaoAlocado(item.status, item.motorista) ? (
                            <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-warning)]">
                              ⚠ Motorista não alocado
                            </p>
                          ) : null}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
