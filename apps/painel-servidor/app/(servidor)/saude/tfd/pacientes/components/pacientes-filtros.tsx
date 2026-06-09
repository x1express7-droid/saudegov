'use client'

import { Card, Input, Select } from '@saude/ui'

// BLOCO-7-PACIENTES
export type PacienteStatusFiltro = 'all' | 'ativo' | 'inativo'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
]

export interface PacientesFiltrosProps {
  nomeBusca: string
  onNomeBuscaChange: (value: string) => void
  statusFiltro: PacienteStatusFiltro
  onStatusFiltroChange: (value: PacienteStatusFiltro) => void
}

export function PacientesFiltros({
  nomeBusca,
  onNomeBuscaChange,
  statusFiltro,
  onStatusFiltroChange,
}: PacientesFiltrosProps) {
  return (
    <Card bodyClassName="p-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-4)] md:flex-row md:items-end md:gap-[var(--space-4)]">
        <div className="min-w-0 flex-1">
          <Input
            id="filtro-nome-paciente-tfd"
            label="Buscar por nome"
            placeholder="Digite parte do nome do paciente..."
            value={nomeBusca}
            onChange={(event) => onNomeBuscaChange(event.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            id="filtro-status-paciente-tfd"
            label="Status"
            options={STATUS_OPTIONS}
            value={statusFiltro}
            onValueChange={(value) => onStatusFiltroChange(value as PacienteStatusFiltro)}
          />
        </div>
      </div>
    </Card>
  )
}
