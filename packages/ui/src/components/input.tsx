'use client'

import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes } from 'react'
import { cn } from '../utils/cn'
import {
  fieldControlClassName,
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
} from '../utils/field-control'
import { DateInputField } from './date-input-field'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  valid?: boolean
  /** Com `type="password"`, exibe botão para revelar senha (padrão: true). */
  passwordToggle?: boolean
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
  type,
  passwordToggle = true,
  ...props
}: InputProps) {
  const generatedId = useId()
  const fieldId = id ?? props.name ?? generatedId
  const hasError = Boolean(error)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPasswordField = type === 'password'
  const showPasswordToggle = isPasswordField && passwordToggle !== false
  const resolvedType = showPasswordToggle && passwordVisible ? 'text' : type
  const showErrorIcon = hasError && !showPasswordToggle

  if (type === 'date') {
    return (
      <DateInputField
        id={id}
        label={label}
        hint={hint}
        error={error}
        valid={valid}
        className={className}
        disabled={disabled}
        required={required}
        {...props}
      />
    )
  }

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
          type={resolvedType}
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
            className: cn(
              (showErrorIcon || showPasswordToggle) && 'pr-[var(--space-10)]',
              className
            ),
          })}
          {...props}
        />
        {showPasswordToggle ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute right-[var(--space-3)] top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-50"
            aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {passwordVisible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
        {showErrorIcon ? (
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
