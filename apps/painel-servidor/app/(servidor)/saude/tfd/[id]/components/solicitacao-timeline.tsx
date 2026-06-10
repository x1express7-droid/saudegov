'use client'

import { TfdSolicitacaoDetalhe } from '@saude/mod-saude-tfd/client'
import { Badge, TramitacaoTimeline, type TramitacaoItem } from '@saude/ui'
import { useMemo } from 'react'

import { SolicitacaoSecaoAccordion } from './solicitacao-secao-accordion'

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

  return (
    <SolicitacaoSecaoAccordion
      titulo="Histórico de tramitações"
      badge={
        items.length > 0 ? (
          <Badge variant="gray" size="sm">
            {items.length}
          </Badge>
        ) : undefined
      }
      defaultOpen={items.length > 0}
    >
      <TramitacaoTimeline tramitacoes={items} ocultarTitulo />
    </SolicitacaoSecaoAccordion>
  )
}
