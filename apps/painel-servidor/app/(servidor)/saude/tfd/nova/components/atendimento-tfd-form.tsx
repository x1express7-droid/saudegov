'use client'

import type { TfdPacienteAtendimentoDetalhe } from '@saude/mod-saude-tfd/client'
import type {
  TfdEspecialidadeListItem,
  TfdPrestadorListItem,
  TfdProcedimentoListItem,
  TfdSolicitacaoOrigemRetornoItem,
} from '@saude/mod-saude-tfd/client'
import { Alert } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { SolicitacaoForm } from '../../components/solicitacao-form'
import {
  PacienteAtendimentoSection,
  type PacienteAtendimentoFormState,
} from './paciente-atendimento-section'

export interface AtendimentoTfdFormProps {
  initialPaciente?: TfdPacienteAtendimentoDetalhe | null
  processoId?: string
  cadsusEnabled?: boolean
  especialidades: TfdEspecialidadeListItem[]
  procedimentos: TfdProcedimentoListItem[]
  prestadores: TfdPrestadorListItem[]
  solicitacoesOrigem: TfdSolicitacaoOrigemRetornoItem[]
}

export function AtendimentoTfdForm({
  initialPaciente,
  processoId,
  cadsusEnabled = false,
  especialidades,
  procedimentos,
  prestadores,
  solicitacoesOrigem: solicitacoesOrigemInitial,
}: AtendimentoTfdFormProps) {
  const router = useRouter()
  const [pacienteId, setPacienteId] = useState<string | undefined>(initialPaciente?.id)
  const [pacienteNome, setPacienteNome] = useState(initialPaciente?.nome ?? '')
  const [pacienteCpf, setPacienteCpf] = useState(initialPaciente?.cpf ?? '')

  function handlePacienteSalvo(id: string, state: PacienteAtendimentoFormState) {
    setPacienteId(id)
    setPacienteNome(state.nome)
    setPacienteCpf(state.cpf)

    if (id !== initialPaciente?.id) {
      router.replace(`/saude/tfd/nova?pacienteId=${id}`)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PacienteAtendimentoSection
        initialDetalhe={initialPaciente}
        cadsusEnabled={cadsusEnabled}
        onPacienteSalvo={handlePacienteSalvo}
      />

      {pacienteId ? (
        <SolicitacaoForm
          key={pacienteId}
          paciente={{
            id: pacienteId,
            nome: pacienteNome,
            possuiCpf: pacienteCpf.length === 11,
          }}
          processoId={processoId}
          especialidades={especialidades}
          procedimentos={procedimentos}
          prestadores={prestadores}
          solicitacoesOrigem={solicitacoesOrigemInitial}
        />
      ) : (
        <Alert variant="info">
          Identifique e salve o paciente acima para habilitar o preenchimento da solicitação TFD.
        </Alert>
      )}
    </div>
  )
}
