'use client'

import type { ReactNode } from 'react'

import { Alert } from '@saude/ui'

// BLOCO-12-RELATORIOS
export interface RelatorioItemRowProps {
  titulo: string
  descricao: string
  filtros: ReactNode
  acao: ReactNode
  erro?: string | null
  showDivider?: boolean
}

export function RelatorioItemRow({
  titulo,
  descricao,
  filtros,
  acao,
  erro,
  showDivider = true,
}: RelatorioItemRowProps) {
  return (
    <div className={showDivider ? 'border-t border-[var(--color-border)] pt-[var(--space-4)]' : ''}>
      <div className="flex flex-col gap-[var(--space-3)] lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 shrink-0 lg:w-[14rem] xl:w-[16rem]">
          <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">{titulo}</p>
          <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {descricao}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[var(--space-2)]">{filtros}</div>

        <div className="flex shrink-0 items-start justify-end">{acao}</div>
      </div>

      {erro ? (
        <Alert variant="error" role="alert" className="mt-[var(--space-3)]">
          {erro}
        </Alert>
      ) : null}
    </div>
  )
}
