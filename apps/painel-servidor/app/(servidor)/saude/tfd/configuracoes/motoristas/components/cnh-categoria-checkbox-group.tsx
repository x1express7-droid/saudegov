'use client'

import {
  CNH_CATEGORIA_LETTERS,
  type CnhCategoriaLetter,
} from '@saude/mod-saude-tfd/client'
import { cn } from '@saude/ui'

interface CnhCategoriaCheckboxGroupProps {
  value: CnhCategoriaLetter[]
  onChange: (value: CnhCategoriaLetter[]) => void
  error?: string
  disabled?: boolean
}

export function CnhCategoriaCheckboxGroup({
  value,
  onChange,
  error,
  disabled,
}: CnhCategoriaCheckboxGroupProps) {
  function toggle(letter: CnhCategoriaLetter) {
    if (disabled) {
      return
    }
    if (value.includes(letter)) {
      onChange(value.filter((item) => item !== letter))
      return
    }
    onChange([...value, letter])
  }

  return (
    <fieldset className="flex flex-col gap-[var(--space-2)]" disabled={disabled}>
      <legend className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
        Categoria da CNH <span className="text-[var(--color-error)]">*</span>
      </legend>
      <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
        Selecione uma ou mais categorias (ex.: B e C para veículos leves e caminhões).
      </p>
      {error ? (
        <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-[var(--space-2)]">
        {CNH_CATEGORIA_LETTERS.map((letter) => {
          const checked = value.includes(letter)
          return (
            <li key={letter}>
              <label
                className={cn(
                  'flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-4)] text-[length:var(--text-sm)] font-semibold transition-colors',
                  checked &&
                    'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]',
                  disabled && 'cursor-not-allowed opacity-60'
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggle(letter)}
                  disabled={disabled}
                />
                {letter}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
