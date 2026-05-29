'use client'

import { ChevronDown, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { cn } from '../utils/cn'
import {
  fieldControlClassName,
  fieldErrorClassName,
  fieldLabelClassName,
} from '../utils/field-control'
import { Spinner } from './spinner'

export interface ComboboxOption {
  value: string
  label: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  id?: string
  label?: string
  error?: string
  required?: boolean
}

const LISTBOX_MAX_VISIBLE = 8
const OPTION_MIN_HEIGHT_REM = 2.75

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled = false,
  loading = false,
  className,
  id,
  label,
  error,
  required,
}: ComboboxProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const listboxId = `${fieldId}-listbox`
  const hasError = Boolean(error)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    if (!normalizedQuery) {
      return options
    }

    return options.filter((option) =>
      normalizeSearch(option.label).includes(normalizedQuery)
    )
  }, [options, query])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setHighlightedIndex(0)
    setQuery(selectedOption?.label ?? '')
  }, [selectedOption?.label])

  const openDropdown = useCallback(() => {
    if (disabled) {
      return
    }

    const selectedIndex =
      value != null && value !== ''
        ? options.findIndex((option) => option.value === value)
        : -1

    setIsOpen(true)
    // Busca vazia ao abrir: exibe todas as opções e permite filtrar digitando.
    setQuery('')
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [disabled, options, value])

  const selectOption = useCallback(
    (option: ComboboxOption) => {
      onChange(option.value)
      setQuery(option.label)
      setIsOpen(false)
      setHighlightedIndex(0)
      inputRef.current?.blur()
    },
    [onChange]
  )

  const clearSelection = useCallback(() => {
    onChange('')
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(0)
    inputRef.current?.focus()
  }, [onChange])

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label ?? '')
    }
  }, [isOpen, selectedOption?.label])

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : 0)
    }
  }, [filteredOptions.length, highlightedIndex])

  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return
    }

    const highlightedElement = listRef.current.querySelector<HTMLElement>(
      `[data-combobox-option-index="${highlightedIndex}"]`
    )
    highlightedElement?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex, isOpen])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [closeDropdown])

  function handleInputChange(nextQuery: string) {
    setQuery(nextQuery)
    setIsOpen(true)
    setHighlightedIndex(0)

    if (selectedOption && nextQuery !== selectedOption.label) {
      onChange('')
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          openDropdown()
          return
        }
        setHighlightedIndex((index) =>
          filteredOptions.length === 0 ? 0 : Math.min(index + 1, filteredOptions.length - 1)
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) {
          openDropdown()
          return
        }
        setHighlightedIndex((index) => Math.max(index - 1, 0))
        break
      case 'Enter':
        event.preventDefault()
        if (isOpen && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex])
        } else {
          openDropdown()
        }
        break
      case 'Escape':
        event.preventDefault()
        closeDropdown()
        inputRef.current?.blur()
        break
      default:
        break
    }
  }

  const showClearButton = Boolean(value) && !disabled && !loading
  const inputValue = isOpen ? query : (selectedOption?.label ?? '')

  return (
    <div ref={containerRef} className="relative w-full">
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
          ref={inputRef}
          id={fieldId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && filteredOptions[highlightedIndex]
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          aria-label={label ?? placeholder}
          aria-invalid={hasError || undefined}
          aria-busy={loading || undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={openDropdown}
          onClick={() => {
            if (!isOpen) {
              openDropdown()
            }
          }}
          onKeyDown={handleKeyDown}
          className={fieldControlClassName({
            error: hasError,
            className: cn('pr-[var(--space-16)]', className),
          })}
        />

        <div className="pointer-events-none absolute right-[var(--space-2)] top-1/2 flex -translate-y-1/2 items-center gap-[var(--space-1)]">
          {loading ? (
            <Spinner className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          ) : null}
          {showClearButton ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Limpar seleção"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearSelection}
              className="pointer-events-auto rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <ChevronDown
            className="size-4 shrink-0 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
        </div>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+var(--space-1))] z-[var(--z-dropdown)] overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_4px_12px_color-mix(in_srgb,var(--color-text)_12%,transparent)]">
            {loading ? (
              <div className="flex items-center justify-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                <Spinner className="size-4 text-[var(--color-primary)]" />
                Carregando…
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="px-[var(--space-3)] py-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Nenhum resultado encontrado
              </p>
            ) : (
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label={label ?? 'Opções'}
                className="overflow-y-auto p-[var(--space-1)]"
                style={{ maxHeight: `calc(${LISTBOX_MAX_VISIBLE} * ${OPTION_MIN_HEIGHT_REM}rem)` }}
              >
                {filteredOptions.map((option, index) => {
                  const isSelected = option.value === value
                  const isHighlighted = index === highlightedIndex

                  return (
                    <li
                      key={option.value}
                      id={`${listboxId}-option-${index}`}
                      data-combobox-option-index={index}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        'cursor-pointer select-none rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)] outline-none',
                        (isHighlighted || isSelected) && 'bg-[var(--color-primary-light)]'
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectOption(option)}
                    >
                      {option.label}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <p id={`${fieldId}-error`} role="alert" className={fieldErrorClassName()}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
