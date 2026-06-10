'use client'

import { cn } from '@saude/ui'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export interface SolicitacaoSecaoAccordionProps {
  titulo: string
  subtitulo?: string
  badge?: ReactNode
  icon?: ReactNode
  defaultOpen?: boolean
  className?: string
  summaryClassName?: string
  bodyClassName?: string
  sticky?: boolean
  /** Ações no cabeçalho (ex.: botão) — não disparam o toggle do accordion. */
  acoesResumo?: ReactNode
  children: ReactNode
}

export function SolicitacaoSecaoAccordion({
  titulo,
  subtitulo,
  badge,
  icon,
  defaultOpen = true,
  className,
  summaryClassName,
  bodyClassName,
  sticky = false,
  acoesResumo,
  children,
}: SolicitacaoSecaoAccordionProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]',
        sticky && 'lg:sticky lg:top-[var(--space-4)]',
        className
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors hover:bg-[var(--color-bg)] [&::-webkit-details-marker]:hidden',
          summaryClassName
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-[var(--space-3)]">
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <span className="min-w-0">
            <span className="block text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
              {titulo}
            </span>
            {subtitulo ? (
              <span className="mt-[var(--space-1)] block text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                {subtitulo}
              </span>
            ) : null}
          </span>
          {badge ? <span className="shrink-0">{badge}</span> : null}
        </span>
        {acoesResumo ? (
          <span
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {acoesResumo}
          </span>
        ) : null}
        <ChevronDown
          className="size-5 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div
        className={cn(
          'border-t border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-4)]',
          bodyClassName
        )}
      >
        {children}
      </div>
    </details>
  )
}
