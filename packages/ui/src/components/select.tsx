'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { AlertCircle, Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import { useOverlayPortalContainer } from '../context/overlay-portal-context'
import {
  fieldControlClassName,
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
} from '../utils/field-control'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  id?: string
  name?: string
  label?: string
  hint?: string
  error?: string
  valid?: boolean
  placeholder?: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
}

export function Select({
  id,
  label,
  hint,
  error,
  valid = false,
  placeholder = 'Selecione...',
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  className,
}: SelectProps) {
  const fieldId = id
  const hasError = Boolean(error)
  const overlayPortal = useOverlayPortalContainer()

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={fieldId} className={fieldLabelClassName()}>
          {label}
          {required ? (
            <span className="text-[var(--color-error)]" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
      >
        <div className="relative">
          <SelectPrimitive.Trigger
            id={fieldId}
            aria-invalid={hasError || undefined}
            aria-describedby={
              [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={fieldControlClassName({
              error: hasError,
              valid: valid && !hasError,
              className: cn(
                'flex items-center justify-between gap-[var(--space-2)] text-left',
                hasError && 'pr-[var(--space-10)]',
                !value && !defaultValue && 'text-[var(--color-text-subtle)]',
                className
              ),
            })}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          {hasError ? (
            <AlertCircle
              className="pointer-events-none absolute right-[var(--space-10)] top-1/2 size-4 -translate-y-1/2 text-[var(--color-error)]"
              aria-hidden="true"
            />
          ) : null}
          <SelectPrimitive.Portal container={overlayPortal ?? undefined}>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className={cn(
                'pointer-events-auto z-[var(--z-dropdown)] max-h-60 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_4px_12px_color-mix(in_srgb,var(--color-text)_12%,transparent)]'
              )}
            >
              <SelectPrimitive.Viewport className="p-[var(--space-1)]">
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </div>
      </SelectPrimitive.Root>
      {hint && !error ? (
        <p id={`${fieldId}-hint`} className={fieldHintClassName()}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className={fieldErrorClassName()}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

function SelectItem({
  value,
  disabled,
  children,
}: {
  value: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-[var(--radius-sm)] py-[var(--space-2)] pl-[var(--space-8)] pr-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text)] outline-none',
        'focus:bg-[var(--color-primary-light)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'data-[highlighted]:bg-[var(--color-primary-light)]'
      )}
    >
      <span className="absolute left-[var(--space-2)] flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-[var(--color-primary)]" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}
