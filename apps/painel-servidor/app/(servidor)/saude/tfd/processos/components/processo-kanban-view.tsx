'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import {
  Button,
  Card,
  EmptyState,
  UrgenciaBadge,
  cn,
  type TfdUrgencia,
  TFD_URGENCIA_CONFIG,
} from '@saude/ui'
import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import {
  PROCESSO_STATUS_CONFIG,
  type ProcessoStatusValue,
} from '../../components/processo-status-badge'
import { formatDateTimeFull, formatRelativeTime, labelSolicitacoes } from './processo-lista-utils'

// BLOCO-8-PROCESSOS
const PROCESSOS_BASE = '/saude/tfd/processos'

const KANBAN_STATUS_ORDER = [
  'ABERTO',
  'EM_ANDAMENTO',
  'AGUARDANDO',
  'AGUARDANDO_COMPLEMENTO',
] as const satisfies readonly ProcessoStatusValue[]

const KANBAN_ENCERRADAS = [
  'CONCLUIDO',
  'CANCELADO',
  'ARQUIVADO',
] as const satisfies readonly ProcessoStatusValue[]

type ProcessoBadgeColor = (typeof PROCESSO_STATUS_CONFIG)[ProcessoStatusValue]['color']

const STATUS_COUNT_CLASSES: Record<ProcessoBadgeColor, string> = {
  gray: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]',
  blue: 'bg-[var(--color-info-light)] text-[var(--color-info)]',
  green: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  red: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
  yellow: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  orange: 'bg-[var(--color-orange-light)] text-[var(--color-orange)]',
  indigo: 'bg-[var(--color-indigo-light)] text-[var(--color-indigo)]',
}

function asTfdUrgencia(value: string | null): TfdUrgencia | null {
  if (!value || !(value in TFD_URGENCIA_CONFIG)) {
    return null
  }
  return value as TfdUrgencia
}

function muitoUrgenteClassName(urgencia: string | null): string {
  return urgencia === 'MUITO_URGENTE' ? 'border-l-4 border-l-[var(--color-error)]' : ''
}

function statusCountClassName(color: ProcessoBadgeColor, count: number): string {
  if (count === 0) {
    return 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
  }
  return STATUS_COUNT_CLASSES[color]
}

export interface ProcessoKanbanViewProps {
  items: ProcessoTfdListItem[]
  mostrarEncerrados: boolean
}

export function ProcessoKanbanView({ items, mostrarEncerrados }: ProcessoKanbanViewProps) {
  const router = useRouter()

  const colunas = useMemo(() => {
    const statusList = mostrarEncerrados
      ? [...KANBAN_STATUS_ORDER, ...KANBAN_ENCERRADAS]
      : [...KANBAN_STATUS_ORDER]

    return statusList.map((status) => ({
      status,
      items: items.filter((item) => item.statusProcesso === status),
    }))
  }, [items, mostrarEncerrados])

  if (items.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum processo encontrado"
        descricao="Ajuste os filtros ou abra um novo processo para iniciar o fluxo TFD."
        cta={
          <Button variant="primary" asChild>
            <Link href="/saude/tfd/processos/novo">Novo processo</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="overflow-x-auto pb-[var(--space-2)]">
      <div className="flex min-w-max gap-[var(--space-4)]">
        {colunas.map((coluna) => {
          const statusConfig = PROCESSO_STATUS_CONFIG[coluna.status]
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
                    Nenhum processo
                  </p>
                ) : (
                  <div className="flex flex-col gap-[var(--space-2)]">
                    {coluna.items.map((item) => {
                      const processoHref = `${PROCESSOS_BASE}/${item.processoId}`
                      const urgencia = asTfdUrgencia(item.urgenciaMaisCritica)

                      return (
                        <Card
                          key={item.processoId}
                          bodyClassName="p-[var(--space-3)]"
                          className={cn(
                            'cursor-pointer transition-shadow hover:shadow-md',
                            muitoUrgenteClassName(item.urgenciaMaisCritica)
                          )}
                          onClick={() => router.push(processoHref)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              router.push(processoHref)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <p className="truncate font-mono text-[length:var(--text-xs)] font-bold text-[var(--color-text)]">
                            {item.protocolo}
                          </p>
                          <p className="truncate text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                            {item.paciente?.nome ?? '—'}
                          </p>
                          <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            {labelSolicitacoes(item.solicitacoes.length)}
                          </p>
                          <div className="mt-[var(--space-2)] flex items-center justify-between gap-[var(--space-2)]">
                            {urgencia ? (
                              <UrgenciaBadge urgencia={urgencia} size="sm" />
                            ) : (
                              <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                —
                              </span>
                            )}
                            <span
                              className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-subtle)]"
                              title={formatDateTimeFull(item.ultimaMovimentacaoEm)}
                            >
                              {formatRelativeTime(item.ultimaMovimentacaoEm)}
                            </span>
                          </div>
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
