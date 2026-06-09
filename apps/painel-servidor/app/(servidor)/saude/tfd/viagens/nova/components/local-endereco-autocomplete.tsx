'use client'

import type { TfdPrestadorListItem } from '@saude/mod-saude-tfd/client'
import { cn } from '@saude/ui'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

const MIN_QUERY_LENGTH = 2
const MUNICIPIO_SEDE_VALUE_PREFIX = '__municipio_sede__'

export interface MunicipioSedeOption {
  cidade: string
  estado: string
}

export interface LocalEnderecoAutocompleteProps {
  id?: string
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  prestadores: TfdPrestadorListItem[]
  municipioSede: MunicipioSedeOption | null
  required?: boolean
  disabled?: boolean
  error?: string
}

interface LocalOption {
  id: string
  label: string
  value: string
}

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function formatPrestadorDescricao(prestador: TfdPrestadorListItem): string {
  return `${prestador.nome} — ${prestador.cidade}/${prestador.estado}`
}

function formatMunicipioSedeLabel(municipio: MunicipioSedeOption): string {
  return `Município sede — ${municipio.cidade}/${municipio.estado}`
}

function formatMunicipioSedeValue(municipio: MunicipioSedeOption): string {
  return `${municipio.cidade}/${municipio.estado}`
}

function buildMunicipioSedeOption(municipio: MunicipioSedeOption): LocalOption {
  return {
    id: MUNICIPIO_SEDE_VALUE_PREFIX,
    label: formatMunicipioSedeLabel(municipio),
    value: formatMunicipioSedeValue(municipio),
  }
}

export function LocalEnderecoAutocomplete({
  id,
  label,
  placeholder = 'Digite para buscar ou informe o local',
  value,
  onChange,
  prestadores,
  municipioSede,
  required,
  disabled,
  error,
}: LocalEnderecoAutocompleteProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const listboxId = `${fieldId}-listbox`
  const hasError = Boolean(error)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const isSelectingOptionRef = useRef(false)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)

  const municipioOption = useMemo(
    () => (municipioSede ? buildMunicipioSedeOption(municipioSede) : null),
    [municipioSede]
  )

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      return []
    }

    const options: LocalOption[] = []

    // BLOCO-2: município sede sempre como primeira opção quando o dropdown está aberto
    if (municipioOption) {
      options.push(municipioOption)
    }

    for (const prestador of prestadores) {
      if (!prestador.ativo) {
        continue
      }

      const searchable = normalizeSearch(
        `${prestador.nome} ${prestador.cidade} ${prestador.estado}`
      )

      if (searchable.includes(normalizedQuery)) {
        options.push({
          id: prestador.id,
          label: formatPrestadorDescricao(prestador),
          value: formatPrestadorDescricao(prestador),
        })
      }
    }

    return options
  }, [municipioOption, prestadores, query])

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
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : 0)
    }
  }, [filteredOptions.length, highlightedIndex])

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
    if (normalizeSearch(nextQuery).length >= MIN_QUERY_LENGTH) {
      setIsOpen(true)
      setHighlightedIndex(0)
    } else {
      setIsOpen(false)
    }

    if (nextQuery.trim() !== value) {
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
        if (filteredOptions.length > 0) {
          setIsOpen(true)
          setHighlightedIndex((index) => Math.min(index + 1, filteredOptions.length - 1))
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (filteredOptions.length > 0) {
          setIsOpen(true)
          setHighlightedIndex((index) => Math.max(index - 1, 0))
        }
        break
      case 'Enter':
        event.preventDefault()
        if (isOpen && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex])
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

  const showDropdown = isOpen && filteredOptions.length > 0

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
            showDropdown && filteredOptions[highlightedIndex]
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          aria-invalid={hasError || undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
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
            hasError &&
              'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error-light)]'
          )}
        />
      </div>

      {showDropdown ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-[var(--z-dropdown)] mt-[var(--space-1)] max-h-60 w-full overflow-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-1)] shadow-[0_4px_12px_color-mix(in_srgb,var(--color-text)_12%,transparent)]"
        >
          {filteredOptions.map((option, index) => (
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
          ))}
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
    </div>
  )
}
