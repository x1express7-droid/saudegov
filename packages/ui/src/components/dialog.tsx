'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentPropsWithoutRef, HTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal

export function DialogOverlay({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--color-text)_40%,transparent)]',
        className
      )}
      {...props}
    />
  )
}

export interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  titulo: string
  descricao?: string
  showClose?: boolean
}

export function DialogContent({
  titulo,
  descricao,
  showClose = true,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100%-var(--space-8))] max-w-lg -translate-x-1/2 -translate-y-1/2',
          'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[0_8px_24px_color-mix(in_srgb,var(--color-text)_16%,transparent)]',
          'focus:outline-none',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-[var(--space-4)]">
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
              {titulo}
            </DialogPrimitive.Title>
            {descricao ? (
              <DialogPrimitive.Description className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {descricao}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {showClose ? (
            <DialogPrimitive.Close
              aria-label="Fechar"
              className={cn(
                'inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors',
                'hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-light)]'
              )}
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          ) : null}
        </div>
        {children ? <div className="mt-[var(--space-6)]">{children}</div> : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-[var(--space-2)]', className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-[var(--space-6)] flex flex-col-reverse gap-[var(--space-2)] sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  )
}
