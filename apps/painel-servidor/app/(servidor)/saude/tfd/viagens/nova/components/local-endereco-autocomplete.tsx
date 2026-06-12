'use client'

import { cn } from '@saude/ui'
import { Loader2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export interface LocalEnderecoAutocompleteProps {
  id?: string
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  error?: string
}

interface LocalOption {
  id: string
  label: string
  value: string
}

export function LocalEnderecoAutocomplete({
  id,
  label,
  placeholder = 'Digite o endereço ou local',
  value,
  onChange,
  required,
  disabled,
  error,
}: LocalEnderecoAutocompleteProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const listboxId = `${fieldId}-listbox`

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const isSelectingOptionRef = useRef(false)
  const requestIdRef = useRef(0)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [options, setOptions] = useState<LocalOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchWarning, setSearchWarning] = useState<string | null>(null)
  const [noResultsFound, setNoResultsFound] = useState(false)

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setHighlightedIndex(0)
  }, [])

  const selectOption = useCallback(
    (option: LocalOption) => {
      isSelectingOptionRef.current = true
      onChange(option.value)
      setQuery(option.value)
      setIsFocused(false)
      setIsOpen(false)
      setHighlightedIndex(0)
      inputRef.current?.blur()
      window.setTimeout(() => {
        isSelectingOptionRef.current = false
      }, 0)
    },
    [onChange]
  )

  const commitFreeText = useCallback(() => {
    const trimmed = query.trim()
    if (trimmed.length === 0) {
      return
    }
    onChange(trimmed)
    setQuery(trimmed)
    setIsOpen(false)
    setHighlightedIndex(0)
    inputRef.current?.blur()
  }, [onChange, query])

  useEffect(() => {
    if (!isFocused) {
      setQuery(value)
    }
  }, [isFocused, value])

  useEffect(() => {
    if (highlightedIndex >= options.length) {
      setHighlightedIndex(options.length > 0 ? options.length - 1 : 0)
    }
  }, [options.length, highlightedIndex])

  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return
    }

    const highlightedElement = listRef.current.querySelector<HTMLElement>(
      `[data-local-option-index="${highlightedIndex}"]`
    )
    highlightedElement?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex, isOpen])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeDropdown()
        inputRef.current?.blur()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [closeDropdown])

  useEffect(() => {
    const trimmed = query.trim()

    if (!isFocused || trimmed.length < MIN_QUERY_LENGTH) {
      setOptions([])
      setIsLoading(false)
      setSearchError(null)
      setSearchWarning(null)
      setNoResultsFound(false)
      return
    }

    const requestId = ++requestIdRef.current
    setIsLoading(true)
    setSearchError(null)
    setSearchWarning(null)
    setNoResultsFound(false)

    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed })
        const response = await fetch(`/api/saude/places/autocomplete?${params.toString()}`)

        if (requestId !== requestIdRef.current) {
          return
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          setOptions([])
          setSearchError(payload?.error ?? 'Não foi possível buscar endereços.')
          setIsOpen(true)
          return
        }

        const payload = (await response.json()) as {
          items?: Array<{ id: string; label: string; value: string }>
          warning?: string
        }

        if (requestId !== requestIdRef.current) {
          return
        }

        const nextOptions = (payload.items ?? []).map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
        }))

        setOptions(nextOptions)
        setSearchWarning(payload.warning ?? null)
        setNoResultsFound(nextOptions.length === 0)
        setIsOpen(true)
        setHighlightedIndex(0)
      } catch {
        if (requestId !== requestIdRef.current) {
          return
        }
        setOptions([])
        setSearchError('Não foi possível buscar endereços.')
        setIsOpen(true)
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isFocused, query])

  function handleBlur() {
    if (isSelectingOptionRef.current) {
      return
    }

    setIsFocused(false)
    const trimmed = query.trim()
    if (trimmed.length > 0) {
      onChange(trimmed)
      setQuery(trimmed)
    } else {
      onChange('')
      setQuery('')
    }
    closeDropdown()
  }

  function handleInputChange(nextQuery: string) {
    setQuery(nextQuery)
    onChange(nextQuery)
    setSearchError(null)
    setSearchWarning(null)
    setNoResultsFound(false)

    if (nextQuery.trim().length >= MIN_QUERY_LENGTH) {
      setIsOpen(true)
      setHighlightedIndex(0)
    } else {
      setIsOpen(false)
      setOptions([])
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (options.length > 0) {
          setIsOpen(true)
          setHighlightedIndex((index) => Math.min(index + 1, options.length - 1))
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (options.length > 0) {
          setIsOpen(true)
          setHighlightedIndex((index) => Math.max(index - 1, 0))
        }
        break
      case 'Enter':
        event.preventDefault()
        if (isOpen && options[highlightedIndex]) {
          selectOption(options[highlightedIndex])
        } else {
          commitFreeText()
        }
        break
      case 'Escape':
        event.preventDefault()
        setQuery(value)
        closeDropdown()
        inputRef.current?.blur()
        break
      default:
        break
    }
  }

  const showDropdown =
    isOpen &&
    (isLoading || options.length > 0 || Boolean(searchError) || Boolean(searchWarning) || noResultsFound)
  const displayError = error ?? searchError

  return (
    <div ref={containerRef} className="relative w-full">
      {label ? (
        <label
          htmlFor={fieldId}
          className="mb-[var(--space-1)] block text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
        >
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
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={
            showDropdown && options[highlightedIndex]
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          aria-invalid={Boolean(displayError) || undefined}
          aria-describedby={displayError ? `${fieldId}-error` : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            setIsFocused(true)
            setQuery(value)
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full min-h-[44px] rounded-[var(--radius)] border bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] pr-[var(--space-10)] text-[length:var(--text-sm)] text-[var(--color-text)]',
            'border-[var(--color-border)] placeholder:text-[var(--color-text-subtle)]',
            'focus-visible:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]',
            'disabled:cursor-not-allowed disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-muted)]',
            displayError &&
              'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error-light)]'
          )}
        />
        {isLoading ? (
          <Loader2
            className="pointer-events-none absolute right-[var(--space-3)] top-1/2 size-4 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {showDropdown ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-[var(--z-dropdown)] mt-[var(--space-1)] max-h-60 w-full overflow-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-1)] shadow-[0_4px_12px_color-mix(in_srgb,var(--color-text)_12%,transparent)]"
        >
          {isLoading ? (
            <li className="px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Buscando endereços…
            </li>
          ) : null}
          {!isLoading && searchError ? (
            <li className="px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-error)]">
              {searchError}
            </li>
          ) : null}
          {!isLoading && !searchError && searchWarning ? (
            <li className="px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-warning)]">
              {searchWarning}
            </li>
          ) : null}
          {!isLoading && !searchError && noResultsFound && !searchWarning ? (
            <li className="px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Nenhum endereço encontrado. Você pode informar o local manualmente.
            </li>
          ) : null}
          {!isLoading
            ? options.map((option, index) => (
                <li
                  key={option.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  data-local-option-index={index}
                  className={cn(
                    'cursor-pointer rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]',
                    index === highlightedIndex && 'bg-[var(--color-primary-light)]'
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectOption(option)
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option.label}
                </li>
              ))
            : null}
        </ul>
      ) : null}

      {error ? (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-error)]"
        >
          {error}
        </p>
      ) : null}

      {!error ? (
        <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          Digite para buscar locais (Google Maps ou municípios) ou informe manualmente.
        </p>
      ) : null}
    </div>
  )
}
