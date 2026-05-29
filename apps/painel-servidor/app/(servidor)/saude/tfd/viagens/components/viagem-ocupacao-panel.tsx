'use client'

import { cn } from '@saude/ui'

export interface ViagemOcupacaoPanelProps {
  ocupadas: number
  capacidade: number | null
  className?: string
}

export function ViagemOcupacaoPanel({ ocupadas, capacidade, className }: ViagemOcupacaoPanelProps) {
  if (capacidade === null) {
    return (
      <div className={cn('rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]', className)}>
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Selecione um veículo para visualizar a ocupação de vagas.
        </p>
      </div>
    )
  }

  const disponiveis = Math.max(0, capacidade - ocupadas)
  const percentual = capacidade > 0 ? Math.min(100, Math.round((ocupadas / capacidade) * 100)) : 0
  const excedeu = ocupadas > capacidade

  return (
    <div className={cn('rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]', className)}>
      <div className="mb-[var(--space-2)] flex items-center justify-between gap-[var(--space-3)]">
        <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
          {ocupadas} de {capacidade} vagas ocupadas
        </p>
        <p
          className={cn(
            'text-[length:var(--text-sm)]',
            excedeu ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'
          )}
        >
          {disponiveis} disponíveis
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            excedeu ? 'bg-[var(--color-error)]' : 'bg-[var(--color-primary)]'
          )}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  )
}
