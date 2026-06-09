'use client'

import type { TfdFonteRecursoValor } from '@saude/mod-saude-tfd/client'
import { Card, Input, Select } from '@saude/ui'

import {
  FONTE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  type SaldoStatusFiltro,
} from './saldos-ui'

// BLOCO-11.1-SALDOS
export interface SaldoFiltrosProps {
  statusFiltro: SaldoStatusFiltro
  onStatusFiltroChange: (value: SaldoStatusFiltro) => void
  fonteFiltro: string
  onFonteFiltroChange: (value: string) => void
  descricaoBusca: string
  onDescricaoBuscaChange: (value: string) => void
}

export function SaldoFiltros({
  statusFiltro,
  onStatusFiltroChange,
  fonteFiltro,
  onFonteFiltroChange,
  descricaoBusca,
  onDescricaoBuscaChange,
}: SaldoFiltrosProps) {
  return (
    <Card bodyClassName="p-[var(--space-4)]">
      <div className="grid gap-[var(--space-4)] md:grid-cols-3">
        <Select
          id="filtro-status-saldo-tfd"
          label="Status"
          options={[...STATUS_FILTER_OPTIONS]}
          value={statusFiltro}
          onValueChange={(value) => onStatusFiltroChange(value as SaldoStatusFiltro)}
        />
        <Select
          id="filtro-fonte-saldo-tfd"
          label="Fonte"
          options={[...FONTE_FILTER_OPTIONS]}
          value={fonteFiltro}
          onValueChange={onFonteFiltroChange}
        />
        <Input
          id="filtro-descricao-saldo-tfd"
          label="Buscar por descrição"
          placeholder="Nome do saldo..."
          value={descricaoBusca}
          onChange={(event) => onDescricaoBuscaChange(event.target.value)}
        />
      </div>
    </Card>
  )
}

export function matchesFonteFiltro(fonte: TfdFonteRecursoValor, fonteFiltro: string): boolean {
  if (fonteFiltro === '__all__' || !fonteFiltro) {
    return true
  }
  return fonte === fonteFiltro
}
