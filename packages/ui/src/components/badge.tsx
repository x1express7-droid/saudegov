import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../utils/cn'

const badgeVariants = cva(
  'inline-flex items-center justify-center border font-medium',
  {
    variants: {
      variant: {
        gray: 'border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text-muted)]',
        blue: 'border-[var(--color-info-light)] bg-[var(--color-info-light)] text-[var(--color-info)]',
        green:
          'border-[var(--color-success-light)] bg-[var(--color-success-light)] text-[var(--color-success)]',
        red: 'border-[var(--color-error-light)] bg-[var(--color-error-light)] text-[var(--color-error)]',
        yellow:
          'border-[var(--color-warning-light)] bg-[var(--color-warning-light)] text-[var(--color-warning)]',
        orange:
          'border-[var(--color-orange-light)] bg-[var(--color-orange-light)] text-[var(--color-orange)]',
        purple:
          'border-[var(--color-purple-light)] bg-[var(--color-purple-light)] text-[var(--color-purple)]',
        teal: 'border-[var(--color-teal-light)] bg-[var(--color-teal-light)] text-[var(--color-teal)]',
        cyan: 'border-[var(--color-cyan-light)] bg-[var(--color-cyan-light)] text-[var(--color-cyan)]',
        indigo:
          'border-[var(--color-indigo-light)] bg-[var(--color-indigo-light)] text-[var(--color-indigo)]',
        emerald:
          'border-[var(--color-emerald-solid)] bg-[var(--color-emerald-solid)] text-white',
        slate:
          'border-[var(--color-slate-solid)] bg-[var(--color-slate-solid)] text-white',
      },
      size: {
        sm: 'rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-xs)]',
        md: 'rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-sm)]',
      },
    },
    defaultVariants: {
      variant: 'gray',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { badgeVariants }
