'use client'

import { ProcessoFiltros } from './processo-filtros'
import { ProcessoLista } from './processo-lista'
import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

// BLOCO-8-PROCESSOS
export interface ProcessoListagemProps {
  items: ProcessoTfdListItem[]
  total: number
  page: number
  perPage: number
  session: SaudeMunicSession
  podeNovaSolicitacao: boolean
}

export function ProcessoListagem({
  items,
  total,
  page,
  perPage,
  session,
  podeNovaSolicitacao,
}: ProcessoListagemProps) {
  return (
    <>
      <ProcessoFiltros />
      <ProcessoLista
        items={items}
        total={total}
        page={page}
        perPage={perPage}
        session={session}
        podeNovaSolicitacao={podeNovaSolicitacao}
      />
    </>
  )
}
