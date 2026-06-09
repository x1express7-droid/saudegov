'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import { Badge, ProtocoloBadge } from '@saude/ui'

// BLOCO-8-PROCESSOS
export interface ProcessoSolicitacoesCelulaProps {
  solicitacoes: ProcessoTfdListItem['solicitacoes']
}

export function ProcessoSolicitacoesCelula({ solicitacoes }: ProcessoSolicitacoesCelulaProps) {
  if (solicitacoes.length === 0) {
    return <span className="text-[var(--color-text-muted)]">—</span>
  }

  if (solicitacoes.length === 1) {
    return (
      <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <ProtocoloBadge
          protocolo={solicitacoes[0]!.protocolo}
          className="max-w-[10rem] [&_.protocolo]:truncate [&_.protocolo]:font-mono [&_.protocolo]:text-xs [&_.protocolo]:font-bold [&_.protocolo]:whitespace-nowrap"
        />
      </div>
    )
  }

  const tooltip = solicitacoes.map((item) => item.protocolo).join('\n')

  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <Badge variant="gray" size="sm" title={tooltip}>
        {solicitacoes.length} solicitações
      </Badge>
    </div>
  )
}
