import { cn } from './cn'

interface FieldControlOptions {
  error?: boolean
  valid?: boolean
  className?: string
}

/** Anel de foco visível por teclado (WCAG / DESIGN_SYSTEM §10). */
export const focusRingClassName =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'

export function fieldControlClassName({ error, valid, className }: FieldControlOptions = {}) {
  return cn(
    'w-full min-h-[44px] rounded-[var(--radius)] border bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)] transition-colors',
    'border-[var(--color-border)] placeholder:text-[var(--color-text-subtle)]',
    'focus-visible:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]',
    'disabled:cursor-not-allowed disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-muted)]',
    error &&
      'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error-light)] focus-visible:ring-[var(--color-error)]',
    valid &&
      !error &&
      'border-[var(--color-success)] focus:border-[var(--color-success)] focus:ring-[var(--color-success-light)]',
    className
  )
}

export function fieldLabelClassName(className?: string) {
  return cn(
    'mb-[var(--space-1)] block text-[length:var(--text-sm)] font-medium text-[var(--color-text)]',
    className
  )
}

export function fieldHintClassName(className?: string) {
  return cn('mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]', className)
}

export function fieldErrorClassName(className?: string) {
  return cn('mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-error)]', className)
}

/** Pilha vertical entre campos (usa escala Tailwind = tokens --space-*). */
export function formFieldsStackClassName(className?: string) {
  return cn('flex flex-col gap-5', className)
}

/** Grade de campos com espaçamento consistente. */
export function formFieldsGridClassName(className?: string) {
  return cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)
}
