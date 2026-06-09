'use client'

import type { TfdSolicitacaoListItem } from '@saude/mod-saude-tfd/client'
import {
  Button,
  Card,
  EmptyState,
  TFD_STATUS_CONFIG,
  TFD_URGENCIA_CONFIG,
  UrgenciaBadge,
  cn,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'
import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

// BLOCO-6-REVISADO
const PROCESSO_BASE = '/saude/tfd/processos'

const KANBAN_STATUS_ORDER = [
  'RASCUNHO',
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
] as const satisfies readonly TfdStatus[]

const KANBAN_ENCERRADAS = ['NEGADO', 'CANCELADO'] as const satisfies readonly TfdStatus[]

type StatusBadgeColor = (typeof TFD_STATUS_CONFIG)[TfdStatus]['color']

const STATUS_COUNT_CLASSES: Record<StatusBadgeColor, string> = {
  gray: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]',
  blue: 'bg-[var(--color-info-light)] text-[var(--color-info)]',
  green: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  red: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
  yellow: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  orange: 'bg-[var(--color-orange-light)] text-[var(--color-orange)]',
  purple: 'bg-[var(--color-purple-light)] text-[var(--color-purple)]',
  teal: 'bg-[var(--color-teal-light)] text-[var(--color-teal)]',
  cyan: 'bg-[var(--color-cyan-light)] text-[var(--color-cyan)]',
  indigo: 'bg-[var(--color-indigo-light)] text-[var(--color-indigo)]',
  emerald: 'bg-[var(--color-emerald-solid)] text-white',
  slate: 'bg-[var(--color-slate-solid)] text-white',
}

function formatDataAbertura(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function asTfdUrgencia(value: string): TfdUrgencia {
  return value in TFD_URGENCIA_CONFIG ? (value as TfdUrgencia) : 'NAO_AGUDA'
}

function muitoUrgenteClassName(urgencia: string): string {
  return urgencia === 'MUITO_URGENTE' ? 'border-l-4 border-l-[var(--color-error)]' : ''
}

function statusCountClassName(color: StatusBadgeColor, count: number): string {
  if (count === 0) {
    return 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
  }
  return STATUS_COUNT_CLASSES[color]
}

export interface SolicitacaoKanbanViewProps {
  items: TfdSolicitacaoListItem[]
  mostrarEncerradas: boolean
}

export function SolicitacaoKanbanView({ items, mostrarEncerradas }: SolicitacaoKanbanViewProps) {
  const router = useRouter()

  const colunas = useMemo(() => {
    const statusList = mostrarEncerradas
      ? [...KANBAN_STATUS_ORDER, ...KANBAN_ENCERRADAS]
      : [...KANBAN_STATUS_ORDER]

    return statusList.map((status) => ({
      status,
      items: items.filter((item) => item.status === status),
    }))
  }, [items, mostrarEncerradas])

  if (items.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma solicitação encontrada"
        descricao="Ajuste os filtros ou abra uma nova solicitação para iniciar o fluxo TFD."
        cta={
          <Button variant="primary" asChild>
            <Link href="/saude/tfd/nova">Nova solicitação</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="overflow-x-auto pb-[var(--space-2)]">
      <div className="flex min-w-max gap-[var(--space-4)]">
        {colunas.map((coluna) => {
          const statusConfig = TFD_STATUS_CONFIG[coluna.status]
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
                    Nenhuma solicitação
                  </p>
                ) : (
                  <div className="flex flex-col gap-[var(--space-2)]">
                    {coluna.items.map((item) => {
                      const processoHref = `${PROCESSO_BASE}/${item.processoId}`

                      return (
                        <Card
                          key={item.id}
                          bodyClassName="p-[var(--space-3)]"
                          className={cn(
                            'cursor-pointer transition-shadow hover:shadow-md',
                            muitoUrgenteClassName(item.urgencia)
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
                            {item.paciente.nome}
                          </p>
                          <p className="truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            {item.especialidade}
                          </p>
                          <div className="mt-[var(--space-2)] flex items-center justify-between gap-[var(--space-2)]">
                            <UrgenciaBadge urgencia={asTfdUrgencia(item.urgencia)} size="sm" />
                            <span className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
                              {formatDataAbertura(item.criadoEm)}
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
