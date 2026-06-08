'use client'

import type { TfdPacienteAtendimentoDetalhe } from '@saude/mod-saude-tfd/client'
import type {
  TfdCidListItem,
  TfdEspecialidadeListItem,
  TfdProcedimentoListItem,
  TfdSolicitacaoOrigemRetornoItem,
} from '@saude/mod-saude-tfd/client'
import { Alert } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { SolicitacaoForm } from '../../components/solicitacao-form'
import { PacienteBuscaSolicitacaoSection } from './paciente-busca-solicitacao-section'

export interface AtendimentoTfdFormProps {
  initialPaciente?: TfdPacienteAtendimentoDetalhe | null
  processoId?: string
  especialidades: TfdEspecialidadeListItem[]
  procedimentos: TfdProcedimentoListItem[]
  cids: TfdCidListItem[]
  solicitacoesOrigem: TfdSolicitacaoOrigemRetornoItem[]
}

export function AtendimentoTfdForm({
  initialPaciente,
  processoId,
  especialidades,
  procedimentos,
  cids,
  solicitacoesOrigem: solicitacoesOrigemInitial,
}: AtendimentoTfdFormProps) {
  const router = useRouter()
  const [pacienteId, setPacienteId] = useState<string | undefined>(initialPaciente?.id)
  const [pacienteNome, setPacienteNome] = useState(initialPaciente?.nome ?? '')
  const [pacienteCpf, setPacienteCpf] = useState(initialPaciente?.cpf ?? '')

  function handlePacienteSelecionado(paciente: TfdPacienteAtendimentoDetalhe) {
    setPacienteId(paciente.id)
    setPacienteNome(paciente.nome)
    setPacienteCpf(paciente.cpf ?? '')

    if (paciente.id !== initialPaciente?.id) {
      router.replace(`/saude/tfd/nova?pacienteId=${paciente.id}`)
      router.refresh()
    }
  }

  function handlePacienteRemovido() {
    setPacienteId(undefined)
    setPacienteNome('')
    setPacienteCpf('')
    router.replace('/saude/tfd/nova')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8">
      <PacienteBuscaSolicitacaoSection
        initialPaciente={initialPaciente}
        onPacienteSelecionado={handlePacienteSelecionado}
        onPacienteRemovido={handlePacienteRemovido}
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
          cids={cids}
          solicitacoesOrigem={solicitacoesOrigemInitial}
        />
      ) : (
        <Alert variant="info">
          Selecione um paciente cadastrado acima para habilitar o preenchimento da solicitação TFD.
        </Alert>
      )}
    </div>
  )
}
