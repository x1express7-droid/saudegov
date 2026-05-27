'use client'

import type { ProcessoTfdDetalheOutput } from '@saude/mod-saude-tfd/client'
import { TramitacaoTimeline, type TramitacaoItem } from '@saude/ui'
import { useMemo } from 'react'

export interface ProcessoTimelineProps {
  tramitacoes: ProcessoTfdDetalheOutput['tramitacoes']
}

export function ProcessoTimeline({ tramitacoes }: ProcessoTimelineProps) {
  const items = useMemo<TramitacaoItem[]>(
    () =>
      tramitacoes.map((item, index) => ({
        id: `${item.tipo}-${item.createdAt}-${index}`,
        tipo: item.tipo,
        descricao: item.descricao,
        autor: { nome: item.usuarioNome ?? 'Sistema' },
        criadoAt: new Date(item.createdAt),
      })),
    [tramitacoes]
  )

  return <TramitacaoTimeline tramitacoes={items} />
}
