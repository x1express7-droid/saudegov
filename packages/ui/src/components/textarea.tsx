'use client'

import { AlertCircle } from 'lucide-react'
import { useId, useState } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../utils/cn'
import {
  fieldControlClassName,
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
} from '../utils/field-control'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  valid?: boolean
  showCount?: boolean
}

export function Textarea({
  id,
  label,
  hint,
  error,
  valid = false,
  showCount = false,
  maxLength,
  className,
  disabled,
  required,
  value,
  defaultValue,
  onChange,
  ...props
}: TextareaProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hasError = Boolean(error)

  const initialLength =
    typeof value === 'string'
      ? value.length
      : typeof defaultValue === 'string'
        ? defaultValue.length
        : 0

  const [charCount, setCharCount] = useState(initialLength)

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
        <textarea
          id={fieldId}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={hasError || undefined}
          aria-describedby={
            [
              hint ? `${fieldId}-hint` : null,
              error ? `${fieldId}-error` : null,
              showCount ? `${fieldId}-count` : null,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={(event) => {
            if (showCount) {
              setCharCount(event.target.value.length)
            }
            onChange?.(event)
          }}
          className={fieldControlClassName({
            error: hasError,
            valid: valid && !hasError,
            className: cn(
              'min-h-[120px] resize-y',
              hasError && 'pr-[var(--space-10)]',
              className
            ),
          })}
          {...props}
        />
        {hasError ? (
          <AlertCircle
            className="pointer-events-none absolute right-[var(--space-3)] top-[var(--space-3)] size-4 text-[var(--color-error)]"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="mt-[var(--space-1)] flex items-start justify-between gap-[var(--space-2)]">
        <div className="min-w-0 flex-1">
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
        {showCount ? (
          <p
            id={`${fieldId}-count`}
            className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
          >
            {charCount}
            {maxLength != null ? ` / ${maxLength}` : ''}
          </p>
        ) : null}
      </div>
    </div>
  )
}
