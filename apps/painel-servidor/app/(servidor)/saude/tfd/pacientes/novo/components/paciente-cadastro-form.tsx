'use client'

import type { TfdPacienteAtendimentoDetalhe } from '@saude/mod-saude-tfd/client'
import { Alert, Button, Card } from '@saude/ui'
import Link from 'next/link'
import { useState } from 'react'

import {
  PacienteAtendimentoSection,
  type PacienteAtendimentoFormState,
} from '../../../nova/components/paciente-atendimento-section'

export interface PacienteCadastroFormProps {
  initialPaciente?: TfdPacienteAtendimentoDetalhe | null
  cadsusEnabled?: boolean
  podeVerPerfilPaciente?: boolean
}

export function PacienteCadastroForm({
  initialPaciente = null,
  cadsusEnabled = false,
  podeVerPerfilPaciente = false,
}: PacienteCadastroFormProps) {
  const [salvo, setSalvo] = useState<{ id: string; nome: string; atualizado: boolean } | null>(null)

  function handlePacienteSalvo(
    id: string,
    state: PacienteAtendimentoFormState,
    atualizado = false
  ) {
    setSalvo({ id, nome: state.nome, atualizado })
  }

  if (salvo) {
    return (
      <Card>
        <Alert
          variant="success"
          titulo={salvo.atualizado ? 'Paciente atualizado com sucesso' : 'Paciente cadastrado com sucesso'}
        >
          {salvo.atualizado
            ? `Os dados de ${salvo.nome} foram atualizados na base deste município.`
            : `${salvo.nome} foi registrado na base deste município.`}
        </Alert>
        <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
          {podeVerPerfilPaciente ? (
            <Button asChild variant="primary">
              <Link href={`/saude/tfd/pacientes/${salvo.id}`}>Ver perfil do paciente</Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary">
            <Link href="/saude/tfd/pacientes/novo">Cadastrar ou editar outro</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/saude/tfd/pacientes">Voltar para lista</Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <PacienteAtendimentoSection
      initialDetalhe={initialPaciente}
      cadsusEnabled={cadsusEnabled}
      onPacienteSalvo={handlePacienteSalvo}
      variant="cadastro"
      notificarSalvoApenasAoSalvar
    />
  )
}
