import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../utils/cn'

const badgeVariants = cva(
  'inline-flex items-center justify-center border font-medium',
  {
    variants: {
      variant: {
        gray: 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]',
        blue: 'border-[var(--color-info-light)] bg-[var(--color-info-light)] text-[var(--color-info)]',
        green:
          'border-[var(--color-success-light)] bg-[var(--color-success-light)] text-[var(--color-success)]',
        red: 'border-[var(--color-error-light)] bg-[var(--color-error-light)] text-[var(--color-error)]',
        yellow:
          'border-[var(--color-warning-light)] bg-[var(--color-warning-light)] text-[var(--color-warning)]',
        orange:
          'border-[var(--color-warning-light)] bg-[var(--color-warning-light)] text-[var(--color-warning)]',
        purple:
          'border-[var(--color-primary-light)] bg-[color-mix(in_srgb,var(--color-primary-light)_60%,var(--color-info-light))] text-[var(--color-primary)]',
        teal: 'border-[var(--color-success-light)] bg-[var(--color-success-light)] text-[var(--color-success)]',
        cyan: 'border-[var(--color-info-light)] bg-[var(--color-info-light)] text-[var(--color-info)]',
        indigo:
          'border-[var(--color-primary-light)] bg-[var(--color-primary-light)] text-[var(--color-primary)]',
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
