'use client'

import { AbrirSolicitacaoInput } from '@saude/mod-saude-tfd/client'
import { Input } from '@saude/ui'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'

export interface SolicitacaoAcompanhanteFieldsProps {
  register: UseFormRegister<AbrirSolicitacaoInput>
  errors: FieldErrors<AbrirSolicitacaoInput>
  disabled?: boolean
}

export function SolicitacaoAcompanhanteFields({
  register,
  errors,
  disabled = false,
}: SolicitacaoAcompanhanteFieldsProps) {
  const acompanhanteErrors = errors.acompanhante

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
