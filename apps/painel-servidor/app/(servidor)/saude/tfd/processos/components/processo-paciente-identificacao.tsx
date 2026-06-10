'use client'

import Link from 'next/link'

import { formatPacienteCpf, formatPacienteTelefone } from './processo-lista-utils'

// BLOCO-8-PROCESSOS
const PACIENTE_BASE = '/saude/tfd/pacientes'

export interface ProcessoPacienteIdentificacaoProps {
  pacienteId: string | null
  nome: string
  cpf: string | null
  telefone: string | null
  onClickStopPropagation?: boolean
  /** inline: nome, CPF e telefone na mesma linha (lista/kanban) */
  layout?: 'inline' | 'stacked'
}

export function ProcessoPacienteIdentificacao({
  pacienteId,
  nome,
  cpf,
  telefone,
  onClickStopPropagation = false,
  layout = 'inline',
}: ProcessoPacienteIdentificacaoProps) {
  const nomeElement = pacienteId ? (
    <Link
      href={`${PACIENTE_BASE}/${pacienteId}`}
      className="truncate font-semibold text-[var(--color-primary)] hover:underline"
      onClick={onClickStopPropagation ? (event) => event.stopPropagation() : undefined}
    >
      {nome}
    </Link>
  ) : (
    <span className="truncate font-semibold text-[var(--color-text)]">{nome}</span>
  )

  if (layout === 'stacked') {
    return (
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-[var(--space-2)] gap-y-0.5 text-[length:var(--text-sm)]">
          {nomeElement}
          <span className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true">
            ·
          </span>
          <span className="shrink-0 font-mono text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {formatPacienteCpf(cpf)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          {formatPacienteTelefone(telefone)}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-[var(--space-3)] gap-y-0.5 text-[length:var(--text-sm)]">
      <span className="min-w-0 shrink">{nomeElement}</span>
      <span
        className="shrink-0 font-mono text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
        title="CPF"
      >
        {formatPacienteCpf(cpf)}
      </span>
      <span
        className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
        title="Telefone"
      >
        {formatPacienteTelefone(telefone)}
      </span>
    </div>
  )
}
