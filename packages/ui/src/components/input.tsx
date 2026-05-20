'use client'

import { AlertCircle } from 'lucide-react'
import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '../utils/cn'
import {
  fieldControlClassName,
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
} from '../utils/field-control'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  valid?: boolean
}

export function Input({
  id,
  label,
  hint,
  error,
  valid = false,
  className,
  disabled,
  required,
  ...props
}: InputProps) {
  const generatedId = useId()
  const fieldId = id ?? props.name ?? generatedId
  const hasError = Boolean(error)

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
      <div className="relative">
        <input
          id={fieldId}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={
            [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={fieldControlClassName({
            error: hasError,
            valid: valid && !hasError,
            className: cn(hasError && 'pr-[var(--space-10)]', className),
          })}
          {...props}
        />
        {hasError ? (
          <AlertCircle
            className="pointer-events-none absolute right-[var(--space-3)] top-1/2 size-4 -translate-y-1/2 text-[var(--color-error)]"
            aria-hidden="true"
          />
        ) : null}
      </div>
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
