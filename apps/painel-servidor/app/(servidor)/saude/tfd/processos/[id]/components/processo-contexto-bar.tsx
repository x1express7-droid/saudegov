'use client'

import type { ProcessoTfdDetalheOutput } from '@saude/mod-saude-tfd/client'
import { Card, CardHeader, formatDateOnlyBr } from '@saude/ui'
import { CalendarDays, FileText, User, Wallet } from 'lucide-react'
import Link from 'next/link'

export type ProcessoDetalheTabId =
  | 'visao'
  | 'solicitacoes'
  | 'financeiro'
  | 'agendamentos'
  | 'historico'
  | 'documentos'

export interface ProcessoContextoBarProps {
  processo: ProcessoTfdDetalheOutput
  totalEstimado?: number | null
  onNavigateTab: (tab: ProcessoDetalheTabId) => void
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function ProcessoContextoBar({
  processo,
  totalEstimado,
  onNavigateTab,
}: ProcessoContextoBarProps) {
  const paciente = processo.paciente

  return (
    <div className="grid gap-[var(--space-4)] md:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
      <Card
        header={
          <CardHeader className="flex items-center gap-[var(--space-2)]">
            <User className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            Paciente
          </CardHeader>
        }
        bodyClassName="py-[var(--space-3)] px-[var(--space-4)]"
      >
        {paciente ? (
          <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
            <dl className="grid min-w-0 flex-1 gap-x-[var(--space-6)] gap-y-[var(--space-2)] sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Nome
                </dt>
                <dd className="mt-0.5 truncate font-medium text-[var(--color-text)]">
                  {paciente.nome}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  CNS
                </dt>
                <dd className="mt-0.5 font-mono text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {paciente.cnsMascarado ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Data de nascimento
                </dt>
                <dd className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {formatDateOnlyBr(paciente.dataNascimento)}
                </dd>
              </div>
            </dl>
            <Link
              href={`/saude/tfd/pacientes/${paciente.id}`}
              className="shrink-0 text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            >
              Ver perfil completo
            </Link>
          </div>
        ) : (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Paciente não vinculado.
          </p>
        )}
      </Card>

      <Card
        header={
          <CardHeader className="flex items-center gap-[var(--space-2)]">
            <FileText className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            Ações rápidas
          </CardHeader>
        }
        bodyClassName="py-[var(--space-3)] px-[var(--space-4)]"
      >
        <nav className="flex flex-col gap-[var(--space-2)]">
          <button
            type="button"
            className="flex items-center gap-[var(--space-2)] text-left text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            onClick={() => onNavigateTab('solicitacoes')}
          >
            <FileText className="size-4 shrink-0" aria-hidden="true" />
            Solicitações ({processo.solicitacoes.length})
          </button>
          <button
            type="button"
            className="flex items-center gap-[var(--space-2)] text-left text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            onClick={() => onNavigateTab('agendamentos')}
          >
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            Agendamentos
          </button>
          <button
            type="button"
            className="flex items-center gap-[var(--space-2)] text-left text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            onClick={() => onNavigateTab('financeiro')}
          >
            <Wallet className="size-4 shrink-0" aria-hidden="true" />
            Financeiro
            {totalEstimado != null && totalEstimado > 0 ? (
              <span className="font-mono text-[length:var(--text-xs)] tabular-nums text-[var(--color-success)]">
                {currencyFormatter.format(totalEstimado)}
              </span>
            ) : null}
          </button>
        </nav>
      </Card>
    </div>
  )
}
