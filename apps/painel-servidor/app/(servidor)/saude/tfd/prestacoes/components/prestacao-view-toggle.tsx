'use client'

import { Button } from '@saude/ui'
import { LayoutGrid, List } from 'lucide-react'

// BLOCO-14-PRESTACOES
export type PrestacaoViewMode = 'table' | 'list'

export const TFD_PRESTACOES_VIEW_STORAGE_KEY = 'tfd_prestacoes_view'

const VIEW_OPTIONS: Array<{
  value: PrestacaoViewMode
  label: string
  icon: typeof LayoutGrid
}> = [
  { value: 'table', label: 'Tabela', icon: LayoutGrid },
  { value: 'list', label: 'Lista', icon: List },
]

export interface PrestacaoViewToggleProps {
  value: PrestacaoViewMode
  onChange: (value: PrestacaoViewMode) => void
}

export function PrestacaoViewToggle({ value, onChange }: PrestacaoViewToggleProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-[var(--space-2)]"
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
