'use client'

import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'
import { Badge } from '@saude/ui'

// BLOCO-10-VIAGENS
export interface ViagemPassageirosCelulaProps {
  item: ViagemTfdListItem
}

export function ViagemPassageirosCelula({ item }: ViagemPassageirosCelulaProps) {
  const { totalPassageiros, capacidadeVeiculo } = item

  if (capacidadeVeiculo === null && totalPassageiros === 0) {
    return <span className="text-[var(--color-text-muted)]">—</span>
  }

  if (capacidadeVeiculo === null) {
    return (
      <Badge variant="gray" size="sm">
        {totalPassageiros}
      </Badge>
    )
  }

  const label = `${totalPassageiros}/${capacidadeVeiculo} vagas`
  const lotado = totalPassageiros === capacidadeVeiculo

  if (lotado) {
    return (
      <Badge variant="red" size="sm">
        {label}
      </Badge>
    )
  }

  return <span className="text-[length:var(--text-xs)] text-[var(--color-text)]">{label}</span>
}
