'use client'

import type { TfdAgendamentoConsultaListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { useState } from 'react'

import { AgendamentoConsultaLista } from './agendamento-consulta-lista'
import { AgendamentoFiltros } from './agendamento-filtros'
import { AgendamentoLegadoLink } from './agendamento-legado-link'
import { AgendamentoLista } from './agendamento-lista'

// BLOCO-9-AGENDAMENTOS
export interface AgendamentoListagemConsultasProps {
  items: TfdAgendamentoConsultaListItem[]
  total: number
  page: number
  perPage: number
  temFiltrosServidor: boolean
}

export function AgendamentoListagemConsultas({
  items,
  total,
  page,
  perPage,
  temFiltrosServidor,
}: AgendamentoListagemConsultasProps) {
  const [pacienteBusca, setPacienteBusca] = useState('')

  return (
    <>
      <AgendamentoFiltros
        modo="consultas"
        pacienteBusca={pacienteBusca}
        onPacienteBuscaChange={setPacienteBusca}
      />
      <AgendamentoLegadoLink />
      <AgendamentoConsultaLista
        items={items}
        total={total}
        page={page}
        perPage={perPage}
        pacienteBusca={pacienteBusca}
        temFiltrosServidor={temFiltrosServidor}
      />
    </>
  )
}

export interface AgendamentoListagemLegadoProps {
  items: Parameters<typeof AgendamentoLista>[0]['items']
  total: number
  session: SaudeMunicSession
}

export function AgendamentoListagemLegado({
  items,
  total,
  session,
}: AgendamentoListagemLegadoProps) {
  return (
    <>
      <AgendamentoFiltros modo="viagens" />
      <AgendamentoLegadoLink />
      <AgendamentoLista items={items} total={total} session={session} />
    </>
  )
}
