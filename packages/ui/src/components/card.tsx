import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode
  footer?: ReactNode
  /** Classes no container do conteúdo (padding padrão mantido). */
  bodyClassName?: string
}

export function Card({ header, footer, children, bodyClassName, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]',
        className
      )}
      {...props}
    >
      {header ? (
        <div className="border-b border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)]">
          {header}
        </div>
      ) : null}
      <div className={cn('px-[var(--space-5)] py-[var(--space-5)]', bodyClassName)}>{children}</div>
      {footer ? (
        <div className="border-t border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)]">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]', className)}
      {...props}
    />
  )
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-[var(--space-2)]', className)} {...props} />
}
