import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'
import { focusRingClassName } from '../utils/field-control'
import { Spinner } from './spinner'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius)] px-[var(--space-4)] py-[var(--space-2)]',
    'text-[length:var(--text-sm)] font-medium transition-colors',
    'min-h-[44px] min-w-[44px]',
    focusRingClassName,
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary)] text-[var(--color-header-text)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-hover)]',
        secondary:
          'bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-primary-light))] active:bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-primary-light))]',
        ghost:
          'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg)] active:bg-[var(--color-border)]',
        danger:
          'bg-[var(--color-error)] text-[var(--color-header-text)] hover:bg-[color-mix(in_srgb,var(--color-error)_88%,var(--color-text))] active:bg-[color-mix(in_srgb,var(--color-error)_80%,var(--color-text))]',
        outline:
          'border border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] active:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-primary-light))]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export function Button({
  className,
  variant,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  const isDisabled = disabled || loading

  return (
    <Comp
      className={cn(buttonVariants({ variant }), className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          <span className="sr-only">Carregando</span>
        </>
      ) : null}
      {children}
    </Comp>
  )
}

export { buttonVariants }
