'use client'

import { Button } from '@saude/ui'
import { Columns3, LayoutGrid, List } from 'lucide-react'

// BLOCO-6-REVISADO
export type SolicitacaoViewMode = 'table' | 'kanban' | 'list'

export const TFD_SOLICITACOES_VIEW_STORAGE_KEY = 'tfd_solicitacoes_view'

const VIEW_OPTIONS: Array<{
  value: SolicitacaoViewMode
  label: string
  icon: typeof LayoutGrid
}> = [
  { value: 'table', label: 'Tabela', icon: LayoutGrid },
  { value: 'kanban', label: 'Kanban', icon: Columns3 },
  { value: 'list', label: 'Lista', icon: List },
]

export interface SolicitacaoViewToggleProps {
  value: SolicitacaoViewMode
  onChange: (value: SolicitacaoViewMode) => void
}

export function SolicitacaoViewToggle({ value, onChange }: SolicitacaoViewToggleProps) {
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
