'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useState, type ComponentPropsWithoutRef, type HTMLAttributes } from 'react'
import { OverlayPortalProvider } from '../context/overlay-portal-context'
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
        'fixed inset-0 z-[100] bg-[color-mix(in_srgb,var(--color-text)_40%,transparent)]',
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

function isRadixOverlayPortalTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.closest('[data-radix-select-content]') !== null ||
    target.closest('[data-radix-select-viewport]') !== null ||
    target.closest('[data-radix-popper-content-wrapper]') !== null ||
    target.closest('[role="listbox"]') !== null ||
    target.closest('[role="option"]') !== null
  )
}

export function DialogContent({
  titulo,
  descricao,
  showClose = true,
  className,
  children,
  onPointerDownOutside,
  onFocusOutside,
  ...props
}: DialogContentProps) {
  const [overlayPortal, setOverlayPortal] = useState<HTMLDivElement | null>(null)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[101] w-[calc(100%-var(--space-8))] max-w-lg -translate-x-1/2 -translate-y-1/2',
          'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[0_8px_24px_color-mix(in_srgb,var(--color-text)_16%,transparent)]',
          'overflow-visible focus:outline-none',
          className
        )}
        onPointerDownOutside={(event) => {
          if (isRadixOverlayPortalTarget(event.target)) {
            event.preventDefault()
          }
          onPointerDownOutside?.(event)
        }}
        onFocusOutside={(event) => {
          if (isRadixOverlayPortalTarget(event.target)) {
            event.preventDefault()
          }
          onFocusOutside?.(event)
        }}
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
        <OverlayPortalProvider container={overlayPortal}>
          <div className="relative">
            {children ? <div className="mt-[var(--space-6)]">{children}</div> : null}
            <div
              ref={setOverlayPortal}
              data-overlay-portal=""
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-dropdown)] h-0 overflow-visible"
              aria-hidden="true"
            />
          </div>
        </OverlayPortalProvider>
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
