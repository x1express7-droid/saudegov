'use client'

import type { TfdSolicitacaoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { useState } from 'react'

import { SolicitacaoFiltros } from './solicitacao-filtros'
import { SolicitacaoLista } from './solicitacao-lista'

// BLOCO-6-SOLICITACOES
export interface SolicitacaoListagemProps {
  items: TfdSolicitacaoListItem[]
  total: number
  session: SaudeMunicSession
}

export function SolicitacaoListagem({ items, total, session }: SolicitacaoListagemProps) {
  const [pacienteBusca, setPacienteBusca] = useState('')

  return (
    <>
      <SolicitacaoFiltros pacienteBusca={pacienteBusca} onPacienteBuscaChange={setPacienteBusca} />
      <SolicitacaoLista
        items={items}
        total={total}
        session={session}
        pacienteBusca={pacienteBusca}
      />
    </>
  )
}
