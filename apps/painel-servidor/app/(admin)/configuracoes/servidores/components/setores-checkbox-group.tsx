'use client'

import { cn } from '@saude/ui'
import type { SetorSelectOption } from '../../../../../lib/types/responsaveis.types'

interface SetoresCheckboxGroupProps {
  options: SetorSelectOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  error?: string
  disabled?: boolean
}

export function SetoresCheckboxGroup({
  options,
  selectedIds,
  onChange,
  error,
  disabled,
}: SetoresCheckboxGroupProps) {
  const byDepartamento = options.reduce<Map<string, SetorSelectOption[]>>((map, opt) => {
    const list = map.get(opt.departamentoNome) ?? []
    list.push(opt)
    map.set(opt.departamentoNome, list)
    return map
  }, new Map())

  function toggle(setorId: string) {
    if (disabled) {
      return
    }
    if (selectedIds.includes(setorId)) {
      onChange(selectedIds.filter((id) => id !== setorId))
    } else {
      onChange([...selectedIds, setorId])
    }
  }

  return (
    <fieldset className="flex flex-col gap-[var(--space-3)]" disabled={disabled}>
      <legend className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
        Setores <span className="text-[var(--color-error)]">*</span>
      </legend>
      {error ? (
        <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {byDepartamento.size === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhum setor ativo. Cadastre setores no organograma primeiro.
        </p>
      ) : (
        [...byDepartamento.entries()].map(([departamento, setores]) => (
          <div key={departamento} className="flex flex-col gap-[var(--space-2)]">
            <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {departamento}
            </p>
            <ul className="flex flex-col gap-[var(--space-2)]">
              {setores.map((setor) => {
                const checked = selectedIds.includes(setor.value)
                return (
                  <li key={setor.value}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)]',
                        checked && 'border-[var(--color-primary)] bg-[var(--color-primary-light)]',
                        disabled && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--color-primary)]"
                        checked={checked}
                        onChange={() => toggle(setor.value)}
                        disabled={disabled}
                      />
                      <span className="text-[length:var(--text-sm)]">{setor.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </fieldset>
  )
}
