'use client'

import { Button } from '@saude/ui'
import { Columns3, LayoutGrid, List } from 'lucide-react'

// BLOCO-7-PACIENTES
export type PacientesViewMode = 'table' | 'kanban' | 'list'

export const TFD_PACIENTES_VIEW_STORAGE_KEY = 'tfd_pacientes_view'

const VIEW_OPTIONS: Array<{
  value: PacientesViewMode
  label: string
  icon: typeof LayoutGrid
}> = [
  { value: 'table', label: 'Tabela', icon: LayoutGrid },
  { value: 'kanban', label: 'Kanban', icon: Columns3 },
  { value: 'list', label: 'Lista', icon: List },
]

export interface PacientesViewToggleProps {
  value: PacientesViewMode
  onChange: (value: PacientesViewMode) => void
}

export function PacientesViewToggle({ value, onChange }: PacientesViewToggleProps) {
  return (
    <div
      className="hidden flex-wrap items-center gap-[var(--space-2)] md:flex"
      role="group"
      aria-label="Modo de visualização"
    >
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = value === option.value

        return (
          <Button
            key={option.value}
            type="button"
            variant={isActive ? 'primary' : 'outline'}
            className="min-h-[36px] px-[var(--space-3)]"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            <Icon className="size-4" aria-hidden="true" />
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
