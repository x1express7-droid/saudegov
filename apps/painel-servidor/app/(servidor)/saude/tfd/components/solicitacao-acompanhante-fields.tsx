'use client'

import type { AbrirSolicitacaoInput } from '@saude/mod-saude-tfd'
import { Input, Select } from '@saude/ui'
import { stripCpf, validateCpf } from '@saude/validators'
import { useState } from 'react'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'

const RELACAO_OPTIONS = [
  { value: 'CONJUGE', label: 'Cônjuge' },
  { value: 'FILHO_A', label: 'Filho(a)' },
  { value: 'PAI_MAE', label: 'Pai ou mãe' },
  { value: 'RESPONSAVEL_LEGAL', label: 'Responsável legal' },
  { value: 'CUIDADOR', label: 'Cuidador' },
  { value: 'OUTRO', label: 'Outro' },
] as const

function formatCpfInput(value: string): string {
  const digits = stripCpf(value).slice(0, 11)
  if (digits.length <= 3) {
    return digits
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export interface SolicitacaoAcompanhanteFieldsProps {
  register: UseFormRegister<AbrirSolicitacaoInput>
  control: Control<AbrirSolicitacaoInput>
  errors: FieldErrors<AbrirSolicitacaoInput>
  disabled?: boolean
}

export function SolicitacaoAcompanhanteFields({
  register,
  control,
  errors,
  disabled = false,
}: SolicitacaoAcompanhanteFieldsProps) {
  const acompanhanteErrors = errors.acompanhante
  const [cpfHint, setCpfHint] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <Input
        label="Nome do acompanhante"
        required
        maxLength={200}
        disabled={disabled}
        error={acompanhanteErrors?.nome?.message}
        {...register('acompanhante.nome')}
      />

      <Controller
        name="acompanhante.cpf"
        control={control}
        render={({ field }) => (
          <Input
            label="CPF do acompanhante"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            disabled={disabled}
            value={formatCpfInput(field.value ?? '')}
            onChange={(event) => {
              const digits = stripCpf(event.target.value)
              field.onChange(digits)

              if (digits.length === 0) {
                setCpfHint(null)
                return
              }
              if (digits.length < 11) {
                setCpfHint('Informe os 11 dígitos do CPF.')
                return
              }
              setCpfHint(
                validateCpf(digits) ? 'CPF válido.' : 'CPF inválido. Verifique os dígitos.'
              )
            }}
            onBlur={field.onBlur}
            error={acompanhanteErrors?.cpf?.message}
            hint={cpfHint ?? undefined}
            valid={cpfHint === 'CPF válido.'}
          />
        )}
      />

      <Controller
        name="acompanhante.relacao"
        control={control}
        render={({ field }) => (
          <Select
            id="acompanhante-relacao"
            label="Relação com o paciente"
            required
            placeholder="Selecione a relação"
            options={[...RELACAO_OPTIONS]}
            value={field.value ?? ''}
            onValueChange={field.onChange}
            disabled={disabled}
            error={acompanhanteErrors?.relacao?.message}
          />
        )}
      />

      <Input
        label="Telefone do acompanhante"
        maxLength={20}
        disabled={disabled}
        hint="Opcional"
        error={acompanhanteErrors?.telefone?.message}
        {...register('acompanhante.telefone')}
      />
    </div>
  )
}
