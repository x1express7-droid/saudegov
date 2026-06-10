'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import { useCallback, useMemo, useState } from 'react'

import { ProcessoPacienteAccordion } from './processo-paciente-accordion'
import { agruparProcessosPorPaciente } from './processo-paciente-grupo'

// BLOCO-8-PROCESSOS
export interface ProcessoListaCompactaViewProps {
  items: ProcessoTfdListItem[]
  podeNovaSolicitacao: boolean
  mostrarEncerrados: boolean
}

export function ProcessoListaCompactaView({
  items,
  podeNovaSolicitacao,
  mostrarEncerrados,
}: ProcessoListaCompactaViewProps) {
  const grupos = useMemo(() => agruparProcessosPorPaciente(items), [items])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleToggle = useCallback((grupoId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(grupoId)) {
        next.delete(grupoId)
      } else {
        next.add(grupoId)
      }
      return next
    })
  }, [])

  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      {grupos.map((grupo) => (
        <ProcessoPacienteAccordion
          key={grupo.grupoId}
          grupo={grupo}
          expanded={expandedIds.has(grupo.grupoId)}
          onToggle={() => handleToggle(grupo.grupoId)}
          podeNovaSolicitacao={podeNovaSolicitacao}
          mostrarEncerrados={mostrarEncerrados}
          variant="card"
          mostrarStatusProcesso={mostrarEncerrados}
        />
      ))}
    </div>
  )
}
