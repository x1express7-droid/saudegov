import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

export interface EmptyStateProps {
  icon?: ReactNode
  titulo: string
  descricao?: string
  cta?: ReactNode
  className?: string
}

export function EmptyState({ icon, titulo, descricao, cta, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-6)] py-[var(--space-12)] text-center',
        className
      )}
    >
      {icon ? (
        <div
          className="mb-[var(--space-4)] flex size-12 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">{titulo}</h2>
      {descricao ? (
        <p className="mt-[var(--space-2)] max-w-md text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          {descricao}
        </p>
      ) : null}
      {cta ? <div className="mt-[var(--space-6)]">{cta}</div> : null}
    </div>
  )
}
