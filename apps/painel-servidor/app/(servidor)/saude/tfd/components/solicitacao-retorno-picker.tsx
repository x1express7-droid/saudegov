'use client'

import { AbrirSolicitacaoInput, TfdSolicitacaoOrigemRetornoItem } from '@saude/mod-saude-tfd/client'
import { Select } from '@saude/ui'
import type { Control, FieldErrors } from 'react-hook-form'
import { Controller } from 'react-hook-form'

const RETORNO_SELECT_PLACEHOLDER = 'Selecione a consulta anterior'

function formatConclusao(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function buildOptionLabel(item: TfdSolicitacaoOrigemRetornoItem): string {
  const conclusao = formatConclusao(item.concluidoEm)
  return `${item.protocolo} — ${item.especialidade} — ${item.prestador.nome} (${item.prestador.cidade}/${item.prestador.estado}) — Concluída em ${conclusao}`
}

export interface SolicitacaoRetornoPickerProps {
  control: Control<AbrirSolicitacaoInput>
  errors: FieldErrors<AbrirSolicitacaoInput>
  pacienteId: string
  solicitacoesOrigem: TfdSolicitacaoOrigemRetornoItem[]
  disabled?: boolean
}

export function SolicitacaoRetornoPicker({
  control,
  errors,
  pacienteId,
  solicitacoesOrigem,
  disabled = false,
}: SolicitacaoRetornoPickerProps) {
  const options = solicitacoesOrigem.map((item) => ({
    value: item.id,
    label: buildOptionLabel(item),
  }))

  const semOpcoes = options.length === 0

  return (
    <Controller
      name="solicitacaoOrigemId"
      control={control}
      render={({ field }) => (
        <Select
          id="solicitacao-origem-retorno"
          label="Consulta anterior (retorno)"
          required
          placeholder={RETORNO_SELECT_PLACEHOLDER}
          options={options}
          value={field.value ?? ''}
          onValueChange={field.onChange}
          disabled={disabled || semOpcoes}
          error={errors.solicitacaoOrigemId?.message}
          hint={
            semOpcoes
              ? `Nenhuma solicitação concluída encontrada para este paciente (ID ${pacienteId.slice(0, 8)}…).`
              : 'Vincule a uma solicitação TFD concluída do mesmo paciente.'
          }
        />
      )}
    />
  )
}
