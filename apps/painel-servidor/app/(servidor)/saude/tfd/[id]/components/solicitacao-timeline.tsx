'use client'

import { TfdSolicitacaoDetalhe } from '@saude/mod-saude-tfd/client'
import { TramitacaoTimeline, type TramitacaoItem } from '@saude/ui'
import { useMemo } from 'react'

export interface SolicitacaoTimelineProps {
  tramitacoes: TfdSolicitacaoDetalhe['tramitacoes']
}

export function SolicitacaoTimeline({ tramitacoes }: SolicitacaoTimelineProps) {
  const items = useMemo<TramitacaoItem[]>(
    () =>
      tramitacoes.map((item, index) => ({
        id: `${item.tipo}-${item.createdAt}-${index}`,
        tipo: item.tipo,
        descricao: item.observacao,
        autor: { nome: item.usuario.nome ?? 'Sistema' },
        criadoAt: new Date(item.createdAt),
      })),
    [tramitacoes]
  )

  return <TramitacaoTimeline tramitacoes={items} />
}
