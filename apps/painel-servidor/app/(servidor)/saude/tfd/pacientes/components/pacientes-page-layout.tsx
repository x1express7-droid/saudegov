'use client'

import type { TfdPacienteVinculadoItem } from '@saude/mod-saude-tfd/client'
import { useState } from 'react'

import { PacienteBuscaForm } from './paciente-busca-form'
import { PacientesLista } from './pacientes-lista'

// BLOCO-7-PACIENTES
export interface PacientesPageLayoutProps {
  items: TfdPacienteVinculadoItem[]
  total: number
  page: number
  perPage: number
  cadsusEnabled: boolean
  podeVerPerfilPaciente: boolean
  podeEditarPaciente: boolean
  podeNovaSolicitacao: boolean
  podeCadastrarPaciente: boolean
}

export function PacientesPageLayout({
  items,
  total,
  page,
  perPage,
  cadsusEnabled,
  podeVerPerfilPaciente,
  podeEditarPaciente,
  podeNovaSolicitacao,
  podeCadastrarPaciente,
}: PacientesPageLayoutProps) {
  const [mostrarLista, setMostrarLista] = useState(true)

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PacienteBuscaForm
        cadsusEnabled={cadsusEnabled}
        podeCadastrarPaciente={podeCadastrarPaciente}
        onEtapaChange={(etapa) => setMostrarLista(etapa === 'busca')}
      />

      {mostrarLista ? (
        <PacientesLista
          items={items}
          total={total}
          page={page}
          perPage={perPage}
          podeVerPerfilPaciente={podeVerPerfilPaciente}
          podeEditarPaciente={podeEditarPaciente}
          podeNovaSolicitacao={podeNovaSolicitacao}
          podeCadastrarPaciente={podeCadastrarPaciente}
        />
      ) : null}
    </div>
  )
}
