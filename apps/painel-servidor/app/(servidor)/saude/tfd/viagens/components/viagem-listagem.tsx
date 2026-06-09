'use client'

import { ViagemFiltros } from './viagem-filtros'
import { ViagemLista } from './viagem-lista'
import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

// BLOCO-10-VIAGENS
export interface ViagemListagemProps {
  items: ViagemTfdListItem[]
  total: number
  page: number
  perPage: number
  session: SaudeMunicSession
  podeNovaViagem: boolean
  temFiltrosServidor: boolean
  motoristas: Array<{ id: string; nome: string }>
  veiculos: Array<{ id: string; placa: string; modelo: string }>
}

export function ViagemListagem({
  items,
  total,
  page,
  perPage,
  session,
  podeNovaViagem,
  temFiltrosServidor,
  motoristas,
  veiculos,
}: ViagemListagemProps) {
  return (
    <>
      <ViagemFiltros motoristas={motoristas} veiculos={veiculos} />
      <ViagemLista
        items={items}
        total={total}
        page={page}
        perPage={perPage}
        session={session}
        podeNovaViagem={podeNovaViagem}
        temFiltrosServidor={temFiltrosServidor}
      />
    </>
  )
}
