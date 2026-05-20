import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import { focusRingClassName } from '../utils/field-control'

export interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  acoes?: ReactNode
  className?: string
}

export function PageHeader({ titulo, subtitulo, breadcrumbs, acoes, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-[var(--space-6)] flex flex-col gap-[var(--space-4)] border-b border-[var(--color-border)] pb-[var(--space-4)]',
        acoes && 'sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-[var(--space-2)]">
            <ol className="flex flex-wrap items-center gap-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1

                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-[var(--space-1)]">
                    {index > 0 ? (
                      <span className="text-[var(--color-text-subtle)]" aria-hidden="true">
                        /
                      </span>
                    ) : null}
                    {crumb.href && !isLast ? (
                      <a
                        href={crumb.href}
                        className={cn(
                          'rounded-[var(--radius-sm)] px-[var(--space-1)] py-[var(--space-1)] text-[var(--color-text-muted)] transition-colors',
                          'hover:text-[var(--color-primary)] hover:underline',
                          focusRingClassName
                        )}
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span
                        className={cn(
                          'px-[var(--space-1)] py-[var(--space-1)]',
                          isLast && 'font-semibold text-[var(--color-text)]'
                        )}
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        ) : null}
        <h1 className="text-[length:var(--text-xl)] font-semibold leading-tight text-[var(--color-text)]">
          {titulo}
        </h1>
        {subtitulo ? (
          <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] leading-relaxed text-[var(--color-text-muted)]">
            {subtitulo}
          </p>
        ) : null}
      </div>
      {acoes ? (
        <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-2)]">{acoes}</div>
      ) : null}
    </header>
  )
}
