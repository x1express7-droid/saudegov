'use client'

import { cn } from '@saude/ui'

export interface EspecialidadeCheckboxOption {
  value: string
  label: string
}

interface EspecialidadesCheckboxGroupProps {
  options: EspecialidadeCheckboxOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  error?: string
  disabled?: boolean
}

export function EspecialidadesCheckboxGroup({
  options,
  selectedIds,
  onChange,
  error,
  disabled,
}: EspecialidadesCheckboxGroupProps) {
  function toggle(especialidadeId: string) {
    if (disabled) {
      return
    }
    if (selectedIds.includes(especialidadeId)) {
      onChange(selectedIds.filter((id) => id !== especialidadeId))
    } else {
      onChange([...selectedIds, especialidadeId])
    }
  }

  return (
    <fieldset className="flex flex-col gap-[var(--space-3)]" disabled={disabled}>
      <legend className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
        Especialidades atendidas
      </legend>
      {error ? (
        <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {options.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhuma especialidade ativa. Cadastre especialidades antes de vincular ao prestador.
        </p>
      ) : (
        <ul className="flex max-h-48 flex-col gap-[var(--space-2)] overflow-y-auto rounded-[var(--radius)] border border-[var(--color-border)] p-[var(--space-2)]">
          {options.map((option) => {
            const checked = selectedIds.includes(option.value)
            return (
              <li key={option.value}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)]',
                    checked && 'bg-[var(--color-primary-light)]',
                    disabled && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-primary)]"
                    checked={checked}
                    onChange={() => toggle(option.value)}
                    disabled={disabled}
                  />
                  <span className="text-[length:var(--text-sm)]">{option.label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}
