'use client'

import type { TfdAgendamentoConsultaListItem } from '@saude/mod-saude-tfd/client'
import { Card, cn } from '@saude/ui'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import {
  AGENDAMENTO_STATUS_CONFIG,
  type AgendamentoStatusValue,
} from '../../components/agendamento-status-badge'
import {
  agendamentoDetalheHref,
  formatDataHoraAgendamento,
  labelPrestadorNome,
  labelTipoAtendimento,
} from './agendamento-lista-utils'

// BLOCO-9-AGENDAMENTOS
const KANBAN_STATUS_ORDER = [
  'AGENDADO',
  'EM_VIAGEM',
  'REALIZADO',
  'CANCELADO',
] as const satisfies readonly AgendamentoStatusValue[]

const KANBAN_ENCERRADAS = ['REALIZADO', 'CANCELADO'] as const satisfies readonly AgendamentoStatusValue[]

type AgendamentoBadgeColor = (typeof AGENDAMENTO_STATUS_CONFIG)[AgendamentoStatusValue]['color']

const STATUS_COUNT_CLASSES: Record<AgendamentoBadgeColor, string> = {
  teal: 'bg-[var(--color-teal-light)] text-[var(--color-teal)]',
  cyan: 'bg-[var(--color-cyan-light)] text-[var(--color-cyan)]',
  green: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  red: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
}

function statusCountClassName(color: AgendamentoBadgeColor, count: number): string {
  if (count === 0) {
    return 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
  }
  return STATUS_COUNT_CLASSES[color]
}

export interface AgendamentoKanbanViewProps {
  items: TfdAgendamentoConsultaListItem[]
  mostrarEncerrados: boolean
}

export function AgendamentoKanbanView({ items, mostrarEncerrados }: AgendamentoKanbanViewProps) {
  const router = useRouter()

  const colunas = useMemo(() => {
    const statusList = mostrarEncerrados
      ? [...KANBAN_STATUS_ORDER]
      : KANBAN_STATUS_ORDER.filter(
          (status) => !(KANBAN_ENCERRADAS as readonly string[]).includes(status)
        )

    return statusList.map((status) => ({
      status,
      items: items.filter((item) => item.status === status),
    }))
  }, [items, mostrarEncerrados])

  return (
    <div className="overflow-x-auto pb-[var(--space-2)]">
      <div className="flex min-w-max gap-[var(--space-4)]">
        {colunas.map((coluna) => {
          const statusConfig = AGENDAMENTO_STATUS_CONFIG[coluna.status]
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
                    Nenhum agendamento
                  </p>
                ) : (
                  <div className="flex flex-col gap-[var(--space-2)]">
                    {coluna.items.map((item) => {
                      const detalheHref = agendamentoDetalheHref(item)

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
                          <p className="truncate font-mono text-[length:var(--text-xs)] font-bold text-[var(--color-text)]">
                            {item.protocolo}
                          </p>
                          <p className="truncate text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                            {item.pacienteNome}
                          </p>
                          <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            {formatDataHoraAgendamento(item.dataConsulta, item.horaConsulta)}
                          </p>
                          <p className="mt-0.5 truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            {labelTipoAtendimento(item.tipoAtendimento)} · {labelPrestadorNome(item)}
                          </p>
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
