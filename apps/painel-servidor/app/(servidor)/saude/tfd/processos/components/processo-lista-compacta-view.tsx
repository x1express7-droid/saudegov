'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import {
  Button,
  Card,
  StatusBadge,
  TFD_STATUS_CONFIG,
  TFD_URGENCIA_CONFIG,
  UrgenciaBadge,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { formatDateTimeFull, formatRelativeTime, labelSolicitacoes } from './processo-lista-utils'

// BLOCO-8-PROCESSOS
const PROCESSOS_BASE = '/saude/tfd/processos'

function asTfdStatus(value: string | null): TfdStatus | null {
  if (!value || !(value in TFD_STATUS_CONFIG)) {
    return null
  }
  return value as TfdStatus
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

export interface ProcessoListaCompactaViewProps {
  items: ProcessoTfdListItem[]
}

export function ProcessoListaCompactaView({ items }: ProcessoListaCompactaViewProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {items.map((item) => {
        const processoHref = `${PROCESSOS_BASE}/${item.processoId}`
        const statusSolicitacao = asTfdStatus(item.statusSolicitacaoMaisRecente)
        const urgencia = asTfdUrgencia(item.urgenciaMaisCritica)

        return (
          <Card
            key={item.processoId}
            bodyClassName="py-[var(--space-3)] px-[var(--space-4)]"
            className={muitoUrgenteClassName(item.urgenciaMaisCritica)}
          >
            <div className="flex items-center gap-[var(--space-3)]">
              <div className="w-32 shrink-0 md:w-48">
                <p className="truncate font-mono text-[length:var(--text-xs)] font-bold whitespace-nowrap text-[var(--color-text)]">
                  {item.protocolo}
                </p>
                <p className="mt-0.5 truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {item.paciente?.nome ?? '—'}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                {statusSolicitacao ? (
                  <StatusBadge status={statusSolicitacao} size="sm" />
                ) : (
                  <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">—</span>
                )}
                <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {labelSolicitacoes(item.solicitacoes.length)}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-[var(--space-1)]">
                {urgencia ? <UrgenciaBadge urgencia={urgencia} size="sm" /> : null}
                <span
                  className="text-[length:var(--text-xs)] text-[var(--color-text-subtle)]"
                  title={formatDateTimeFull(item.ultimaMovimentacaoEm)}
                >
                  {formatRelativeTime(item.ultimaMovimentacaoEm)}
                </span>
              </div>

              <div className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                  onClick={() => router.push(processoHref)}
                >
                  Ver
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
