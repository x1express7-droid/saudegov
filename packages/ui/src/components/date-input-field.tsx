'use client'

import { Calendar } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type FocusEvent } from 'react'
import { cn } from '../utils/cn'
import {
  brDateToIso,
  isoDateToBr,
  maskBrDateInput,
} from '../utils/date-input-format'
import {
  fieldControlClassName,
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
} from '../utils/field-control'
import type { InputProps } from './input'

export type DateInputFieldProps = Omit<InputProps, 'type' | 'passwordToggle'>

export function DateInputField({
  id,
  label,
  hint,
  error,
  valid = false,
  className,
  disabled,
  required,
  value,
  onChange,
  onBlur,
  name,
  ...props
}: DateInputFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? name ?? generatedId
  const nativePickerRef = useRef<HTMLInputElement>(null)
  const hasError = Boolean(error)

  const isoValue = typeof value === 'string' ? value : ''
  const [displayValue, setDisplayValue] = useState(() => isoDateToBr(isoValue))

  useEffect(() => {
    setDisplayValue(isoDateToBr(isoValue))
  }, [isoValue])

  function emitIsoChange(iso: string, sourceEvent?: ChangeEvent<HTMLInputElement>) {
    if (!onChange) {
      return
    }

    const event = {
      ...(sourceEvent ?? {}),
      target: {
        ...(sourceEvent?.target ?? {}),
        value: iso,
        name: name ?? sourceEvent?.target.name ?? '',
        id: fieldId,
      },
      currentTarget: {
        ...(sourceEvent?.currentTarget ?? {}),
        value: iso,
        name: name ?? sourceEvent?.currentTarget.name ?? '',
        id: fieldId,
      },
    } as ChangeEvent<HTMLInputElement>

    onChange(event)
  }

  function handleDisplayChange(event: ChangeEvent<HTMLInputElement>) {
    const masked = maskBrDateInput(event.target.value)
    setDisplayValue(masked)

    if (masked.length === 0) {
      emitIsoChange('', event)
      return
    }

    if (masked.length === 10) {
      const iso = brDateToIso(masked)
      if (iso) {
        emitIsoChange(iso, event)
      }
    }
  }

  function handleDisplayBlur(event: FocusEvent<HTMLInputElement>) {
    onBlur?.(event)

    if (displayValue.length === 0) {
      return
    }

    const iso = brDateToIso(displayValue)
    if (!iso) {
      setDisplayValue(isoDateToBr(isoValue))
      return
    }

    setDisplayValue(isoDateToBr(iso))
    if (iso !== isoValue) {
      emitIsoChange(iso, event)
    }
  }

  function handleNativePickerChange(event: ChangeEvent<HTMLInputElement>) {
    const iso = event.target.value
    setDisplayValue(isoDateToBr(iso))
    emitIsoChange(iso, event)
  }

  function openNativePicker() {
    const picker = nativePickerRef.current
    if (!picker || disabled) {
      return
    }
    picker.showPicker?.()
    picker.focus()
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
          {...props}
          id={fieldId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          disabled={disabled}
          required={required}
          value={displayValue}
          aria-invalid={hasError || undefined}
          aria-describedby={
            [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={handleDisplayChange}
          onBlur={handleDisplayBlur}
          className={fieldControlClassName({
            error: hasError,
            valid: valid && !hasError,
            className: cn('pr-[var(--space-10)]', className),
          })}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={openNativePicker}
          className="absolute right-[var(--space-3)] top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-50"
          aria-label="Abrir calendário"
        >
          <Calendar className="size-4" aria-hidden="true" />
        </button>
        <input
          ref={nativePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute size-0 opacity-0"
          value={isoValue}
          disabled={disabled}
          onChange={handleNativePickerChange}
        />
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
