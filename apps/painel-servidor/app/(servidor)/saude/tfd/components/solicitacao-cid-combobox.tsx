// BLOCO-CID-COMPLETO
'use client'

import { buscarCidsTfd } from '@saude/mod-saude-tfd/actions/cid'
import { cn, Spinner } from '@saude/ui'
import { ChevronDown, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

const BUSCA_DEBOUNCE_MS = 300
const MIN_BUSCA_CHARS = 2
const LISTBOX_MAX_VISIBLE = 8
const OPTION_MIN_HEIGHT_REM = 2.75

interface CidOption {
  value: string
  label: string
}

export interface SolicitacaoCidComboboxProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}

function formatCidLabel(codigo: string, descricao: string): string {
  return `${codigo} — ${descricao}`
}

export function SolicitacaoCidCombobox({
  value,
  onChange,
  disabled = false,
  error,
}: SolicitacaoCidComboboxProps) {
  const generatedId = useId()
  const fieldId = `${generatedId}-cid-principal`
  const listboxId = `${fieldId}-listbox`
  const hasError = Boolean(error)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const buscaRequestId = useRef(0)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [options, setOptions] = useState<CidOption[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setHighlightedIndex(0)
    setQuery(selectedLabel)
  }, [selectedLabel])

  const openDropdown = useCallback(() => {
    if (disabled) {
      return
    }

    setIsOpen(true)
    setQuery('')
    setHighlightedIndex(0)
  }, [disabled])

  const selectOption = useCallback(
    (option: CidOption) => {
      onChange(option.value)
      setSelectedLabel(option.label)
      setQuery(option.label)
      setOptions([])
      setIsOpen(false)
      setHighlightedIndex(0)
      inputRef.current?.blur()
    },
    [onChange]
  )

  const clearSelection = useCallback(() => {
    onChange('')
    setSelectedLabel('')
    setQuery('')
    setOptions([])
    setIsOpen(false)
    setHighlightedIndex(0)
    inputRef.current?.focus()
  }, [onChange])

  useEffect(() => {
    if (!value) {
      setSelectedLabel('')
      if (!isOpen) {
        setQuery('')
      }
      return
    }

    if (selectedLabel.startsWith(`${value} —`)) {
      return
    }

    setSelectedLabel(value)
    if (!isOpen) {
      setQuery(value)
    }
  }, [isOpen, selectedLabel, value])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const busca = query.trim()
    if (busca.length < MIN_BUSCA_CHARS) {
      setOptions([])
      setLoading(false)
      return
    }

    setLoading(true)
    const requestId = ++buscaRequestId.current
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await buscarCidsTfd({ busca, limite: 20 })
        if (requestId !== buscaRequestId.current) {
          return
        }

        setLoading(false)
        if (!response.success) {
          setOptions([])
          return
        }

        setOptions(
          response.data.map((item) => ({
            value: item.codigo,
            label: formatCidLabel(item.codigo, item.descricao),
          }))
        )
        setHighlightedIndex(0)
      })()
    }, BUSCA_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isOpen, query])

  useEffect(() => {
    if (highlightedIndex >= options.length) {
      setHighlightedIndex(options.length > 0 ? options.length - 1 : 0)
    }
  }, [highlightedIndex, options.length])

  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return
    }

    const highlightedElement = listRef.current.querySelector<HTMLElement>(
      `[data-cid-option-index="${highlightedIndex}"]`
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

    if (value && nextQuery !== selectedLabel) {
      onChange('')
      setSelectedLabel('')
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
          options.length === 0 ? 0 : Math.min(index + 1, options.length - 1)
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
        if (isOpen && options[highlightedIndex]) {
          selectOption(options[highlightedIndex])
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

  const busca = query.trim()
  const showClearButton = Boolean(value) && !disabled && !loading
  const inputValue = isOpen ? query : selectedLabel

  let dropdownContent: ReactNode
  if (loading) {
    dropdownContent = (
      <div className="flex items-center justify-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        <Spinner className="size-4 text-[var(--color-primary)]" />
        Carregando…
      </div>
    )
  } else if (busca.length < MIN_BUSCA_CHARS) {
    dropdownContent = (
      <p className="px-[var(--space-3)] py-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Digite pelo menos 2 caracteres para buscar
      </p>
    )
  } else if (options.length === 0) {
    dropdownContent = (
      <p className="px-[var(--space-3)] py-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        {`Nenhum CID encontrado para '${busca}'`}
      </p>
    )
  } else {
    dropdownContent = (
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label="CIDs"
        className="overflow-y-auto p-[var(--space-1)]"
        style={{ maxHeight: `calc(${LISTBOX_MAX_VISIBLE} * ${OPTION_MIN_HEIGHT_REM}rem)` }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value
          const isHighlighted = index === highlightedIndex

          return (
            <li
              key={option.value}
              id={`${listboxId}-option-${index}`}
              data-cid-option-index={index}
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
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label
        htmlFor={fieldId}
        className="mb-[var(--space-1)] block text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
      >
        CID
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && options[highlightedIndex]
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          aria-label="CID"
          aria-invalid={hasError || undefined}
          aria-busy={loading || undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder="Selecione o CID (opcional)"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={openDropdown}
          onClick={() => {
            if (!isOpen) {
              openDropdown()
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full rounded-[var(--radius)] border bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-50',
            hasError
              ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-2 focus:ring-[var(--color-error)]/20'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20',
            'pr-[var(--space-16)]'
          )}
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
            {dropdownContent}
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-error)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
