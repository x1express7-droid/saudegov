'use client'

import { Input } from '@saude/ui'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 250
const MIN_CHARS = 2

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

interface MunicipioOption {
  label: string
  value: string
}

interface MunicipioNascimentoComboboxProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function MunicipioNascimentoCombobox({
  id = 'paciente-municipio-nasc',
  label = 'Município de nascimento',
  value,
  onChange,
  disabled = false,
}: MunicipioNascimentoComboboxProps) {
  const [query, setQuery] = useState(value)
  const [options, setOptions] = useState<MunicipioOption[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [listaAberta, setListaAberta] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (!listaAberta) {
      return
    }

    const termo = query.trim()
    if (termo.length < MIN_CHARS) {
      setOptions([])
      setLoading(false)
      setErro(null)
      return
    }

    setLoading(true)
    setErro(null)

    const currentRequest = ++requestId.current
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/saude/ibge/municipios?q=${encodeURIComponent(termo)}`
          )
          if (currentRequest !== requestId.current) {
            return
          }

          if (!response.ok) {
            setOptions([])
            setErro('Não foi possível buscar municípios.')
            return
          }

          const data = (await response.json()) as { items: MunicipioOption[] }
          setOptions(data.items)
          setErro(null)
        } catch {
          if (currentRequest === requestId.current) {
            setOptions([])
            setErro('Não foi possível buscar municípios.')
          }
        } finally {
          if (currentRequest === requestId.current) {
            setLoading(false)
          }
        }
      })()
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [listaAberta, query])

  function handleSelect(option: MunicipioOption) {
    onChange(option.value)
    setQuery(option.value)
    setListaAberta(false)
    setOptions([])
  }

  const termoCurto = query.trim().length > 0 && query.trim().length < MIN_CHARS
  const termoValido = query.trim().length >= MIN_CHARS
  const exibirLista = listaAberta && termoValido

  const hint = loading
    ? 'Buscando municípios…'
    : termoCurto
      ? `Digite ao menos ${MIN_CHARS} caracteres para buscar.`
      : 'Digite o nome do município para ver sugestões.'

  return (
    <div className="relative w-full">
      <Input
        id={id}
        label={label}
        value={query}
        onChange={(event) => {
          const next = event.target.value
          setQuery(next)
          setListaAberta(true)
          if (value && normalizeSearch(next) !== normalizeSearch(value)) {
            onChange('')
          }
        }}
        onFocus={() => setListaAberta(true)}
        onBlur={() => {
          window.setTimeout(() => setListaAberta(false), 150)
        }}
        disabled={disabled}
        placeholder="Ex.: Campo Grande/MS"
        autoComplete="off"
        hint={hint}
        error={erro && !exibirLista ? erro : undefined}
        aria-autocomplete="list"
        aria-expanded={exibirLista}
      />

      {exibirLista ? (
        <div
          className="absolute z-20 mt-[var(--space-1)] w-full overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
          role="listbox"
          aria-label="Sugestões de municípios"
        >
          {loading ? (
            <div className="flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Buscando municípios…
            </div>
          ) : options.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto py-[var(--space-1)]">
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className="w-full px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] hover:bg-[var(--color-bg)]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option)}
                    disabled={disabled}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-[var(--space-3)] py-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Nenhum município encontrado.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
