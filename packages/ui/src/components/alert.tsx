import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

const alertVariants = cva(
  'flex gap-[var(--space-3)] rounded-[var(--radius)] border p-[var(--space-4)] text-[length:var(--text-sm)]',
  {
    variants: {
      variant: {
        info: 'border-[var(--color-info-light)] bg-[var(--color-info-light)] text-[var(--color-info)]',
        success:
          'border-[var(--color-success-light)] bg-[var(--color-success-light)] text-[var(--color-success)]',
        warning:
          'border-[var(--color-warning-light)] bg-[var(--color-warning-light)] text-[var(--color-warning)]',
        error: 'border-[var(--color-error-light)] bg-[var(--color-error-light)] text-[var(--color-error)]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
)

const alertIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
} as const

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  titulo?: string
  children?: ReactNode
}

export function Alert({ variant = 'info', titulo, children, className, ...props }: AlertProps) {
  const resolvedVariant = variant ?? 'info'
  const Icon = alertIcons[resolvedVariant]

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      <Icon className="mt-[var(--space-1)] size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo ? <p className="font-semibold">{titulo}</p> : null}
        {children ? (
          <div className={cn(titulo && 'mt-[var(--space-1)]', 'text-[length:var(--text-sm)]')}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { alertVariants }
