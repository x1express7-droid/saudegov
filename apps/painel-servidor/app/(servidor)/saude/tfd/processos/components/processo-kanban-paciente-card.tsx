'use client'

import { Badge, Button, UrgenciaBadge, cn, TFD_URGENCIA_CONFIG, type TfdUrgencia } from '@saude/ui'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ProcessoStatusBadge } from '../../components/processo-status-badge'
import { ProcessoPacienteIdentificacao } from './processo-paciente-identificacao'
import {
  formatDateTimeFull,
  formatRelativeTime,
  formatValorEstimadoProcesso,
  labelSolicitacoes,
} from './processo-lista-utils'
import { labelProcessosAtivos, type ProcessoPacienteGrupo } from './processo-paciente-grupo'

// BLOCO-8-PROCESSOS
const PROCESSOS_BASE = '/saude/tfd/processos'

function asTfdUrgencia(value: string | null): TfdUrgencia | null {
  if (!value || !(value in TFD_URGENCIA_CONFIG)) {
    return null
  }
  return value as TfdUrgencia
}

function muitoUrgenteClassName(urgencia: string | null): string {
  return urgencia === 'MUITO_URGENTE' ? 'border-l-4 border-l-[var(--color-error)]' : ''
}

export interface ProcessoKanbanPacienteCardProps {
  grupo: ProcessoPacienteGrupo
  statusColuna: string
  mostrarEncerrados: boolean
}

export function ProcessoKanbanPacienteCard({
  grupo,
  statusColuna,
  mostrarEncerrados,
}: ProcessoKanbanPacienteCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const processosNaColuna = grupo.processosAtivos.filter(
    (processo) => processo.statusProcesso === statusColuna
  )
  const processosEncerradosNaColuna = mostrarEncerrados
    ? grupo.processosEncerrados.filter((processo) => processo.statusProcesso === statusColuna)
    : []
  const todosNaColuna = [...processosNaColuna, ...processosEncerradosNaColuna]

  if (todosNaColuna.length === 0) {
    return null
  }

  const urgencia = asTfdUrgencia(grupo.urgenciaMaisCritica)
  const unico = todosNaColuna.length === 1 ? todosNaColuna[0]! : null

  if (unico) {
    const processoHref = `${PROCESSOS_BASE}/${unico.processoId}`

    return (
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-3)] transition-shadow hover:shadow-md',
          muitoUrgenteClassName(unico.urgenciaMaisCritica)
        )}
        onClick={() => router.push(processoHref)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            router.push(processoHref)
          }
        }}
      >
        <ProcessoPacienteIdentificacao
          pacienteId={grupo.pacienteId}
          nome={grupo.pacienteNome}
          cpf={grupo.pacienteCpf}
          telefone={grupo.pacienteTelefone}
          onClickStopPropagation
          layout="inline"
        />
        <p className="mt-1 truncate font-mono text-[length:var(--text-xs)] font-bold text-[var(--color-text-muted)]">
          {unico.protocolo}
        </p>
        <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          {labelSolicitacoes(unico.solicitacoes.length)}
          {unico.valorTotalEstimado > 0
            ? ` · ${formatValorEstimadoProcesso(unico.valorTotalEstimado)}`
            : ''}
        </p>
        <div className="mt-[var(--space-2)] flex items-center justify-between gap-[var(--space-2)]">
          {urgencia ? (
            <UrgenciaBadge urgencia={urgencia} size="sm" />
          ) : (
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">—</span>
          )}
          <span
            className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-subtle)]"
            title={formatDateTimeFull(unico.ultimaMovimentacaoEm)}
          >
            {formatRelativeTime(unico.ultimaMovimentacaoEm)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]',
        muitoUrgenteClassName(grupo.urgenciaMaisCritica)
      )}
    >
      <button
        type="button"
        className="flex w-full flex-col gap-[var(--space-2)] p-[var(--space-3)] text-left"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-[var(--space-2)]">
          <div className="min-w-0 flex-1">
            <ProcessoPacienteIdentificacao
              pacienteId={grupo.pacienteId}
              nome={grupo.pacienteNome}
              cpf={grupo.pacienteCpf}
              telefone={grupo.pacienteTelefone}
              layout="inline"
            />
            <Badge variant="gray" size="sm" className="mt-1">
              {labelProcessosAtivos(todosNaColuna.length)} nesta coluna
            </Badge>
          </div>
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
          )}
        </div>
        <div className="flex items-center justify-between gap-[var(--space-2)]">
          {urgencia ? (
            <UrgenciaBadge urgencia={urgencia} size="sm" />
          ) : (
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">—</span>
          )}
          <span
            className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-subtle)]"
            title={formatDateTimeFull(grupo.ultimaMovimentacaoEm)}
          >
            {formatRelativeTime(grupo.ultimaMovimentacaoEm)}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-[var(--space-2)] border-t border-[var(--color-border)] p-[var(--space-2)]">
          {todosNaColuna.map((processo) => (
            <div
              key={processo.processoId}
              className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-bg)] p-[var(--space-2)]"
            >
              <div className="flex items-center justify-between gap-[var(--space-2)]">
                <p className="truncate font-mono text-[length:var(--text-xs)] font-bold text-[var(--color-text)]">
                  {processo.protocolo}
                </p>
                <ProcessoStatusBadge status={processo.statusProcesso} size="sm" />
              </div>
              <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                {labelSolicitacoes(processo.solicitacoes.length)}
                {processo.valorTotalEstimado > 0
                  ? ` · ${formatValorEstimadoProcesso(processo.valorTotalEstimado)}`
                  : ''}
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href={`${PROCESSOS_BASE}/${processo.processoId}`}>Ver processo</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
