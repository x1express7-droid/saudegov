'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import {
  StatusBadge,
  TFD_STATUS_CONFIG,
  TFD_URGENCIA_CONFIG,
  UrgenciaBadge,
  cn,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'

import { ProcessoStatusBadge } from '../../components/processo-status-badge'
import { ProcessoAcoesCelula } from './processo-acoes-celula'
import { ProcessoSolicitacoesCelula } from './processo-solicitacoes-celula'
import {
  formatDateTimeFull,
  formatRelativeTime,
  formatValorEstimadoProcesso,
} from './processo-lista-utils'
import {
  PROCESSO_TABELA_ACOES_CELL_CLASS,
  PROCESSO_TABELA_CHEVRON_CELL_CLASS,
  PROCESSO_TABELA_SUB_ROW_CLASS,
  PROCESSO_TABELA_TD_CLASS,
  PROCESSO_TABELA_VALOR_CELL_CLASS,
} from './processo-tabela-colunas'

// BLOCO-8-PROCESSOS
function asTfdStatus(value: string | null): TfdStatus | null {
  if (!value || !(value in TFD_STATUS_CONFIG)) {
    return null
  }
  return value as TfdStatus
}

function asTfdUrgencia(value: string | null): TfdUrgencia | null {
  if (!value || !(value in TFD_URGENCIA_CONFIG)) {
    return null
  }
  return value as TfdUrgencia
}

export interface ProcessoItemDetalheProps {
  item: ProcessoTfdListItem
  podeNovaSolicitacao: boolean
  compact?: boolean
  embedded?: boolean
  /** Alinha a sublinha às colunas da tabela agrupada. */
  tableRowLayout?: boolean
  mostrarStatusProcesso?: boolean
}

export function ProcessoItemDetalhe({
  item,
  podeNovaSolicitacao,
  compact = false,
  embedded = false,
  tableRowLayout = false,
  mostrarStatusProcesso = false,
}: ProcessoItemDetalheProps) {
  const statusSolicitacao = asTfdStatus(item.statusSolicitacaoMaisRecente)
  const urgencia = asTfdUrgencia(item.urgenciaMaisCritica)

  if (tableRowLayout) {
    return (
      <tr className={PROCESSO_TABELA_SUB_ROW_CLASS}>
        <td className={PROCESSO_TABELA_CHEVRON_CELL_CLASS} aria-hidden="true" />
        <td className={PROCESSO_TABELA_TD_CLASS}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-[var(--space-2)] gap-y-[var(--space-1)]">
            <span
              className="shrink-0 font-mono text-[length:var(--text-xs)] font-bold tracking-tight text-[var(--color-text)]"
              title={item.protocolo}
            >
              {item.protocolo}
            </span>
            <div className="flex flex-wrap items-center gap-[var(--space-1)]">
              {mostrarStatusProcesso ? (
                <ProcessoStatusBadge status={item.statusProcesso} size="sm" />
              ) : null}
              {statusSolicitacao ? <StatusBadge status={statusSolicitacao} size="sm" /> : null}
            </div>
          </div>
        </td>
        <td className={PROCESSO_TABELA_TD_CLASS}>
          <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">—</span>
        </td>
        <td className={PROCESSO_TABELA_TD_CLASS}>
          <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">—</span>
        </td>
        <td className={PROCESSO_TABELA_TD_CLASS}>
          <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {item.solicitacoes.length > 0 ? `${item.solicitacoes.length} sol.` : '—'}
          </span>
        </td>
        <td className={PROCESSO_TABELA_TD_CLASS}>
          {urgencia ? <UrgenciaBadge urgencia={urgencia} size="sm" /> : <span>—</span>}
        </td>
        <td className={PROCESSO_TABELA_TD_CLASS}>
          <span
            className={`${PROCESSO_TABELA_VALOR_CELL_CLASS} ${
              item.valorTotalEstimado > 0 ? 'font-semibold text-[var(--color-success)]' : ''
            }`}
            title="Total estimado das despesas lançadas nas solicitações"
          >
            {formatValorEstimadoProcesso(item.valorTotalEstimado)}
          </span>
        </td>
        <td className={PROCESSO_TABELA_TD_CLASS}>
          <span
            className="block truncate text-right text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
            title={formatDateTimeFull(item.ultimaMovimentacaoEm)}
          >
            {formatRelativeTime(item.ultimaMovimentacaoEm)}
          </span>
        </td>
        <td className={cn(PROCESSO_TABELA_TD_CLASS, PROCESSO_TABELA_ACOES_CELL_CLASS)}>
          <ProcessoAcoesCelula
            item={item}
            podeNovaSolicitacao={podeNovaSolicitacao}
            dense
          />
        </td>
      </tr>
    )
  }

  if (compact || embedded) {
    return (
      <li
        className={
          embedded
            ? 'flex items-center gap-[var(--space-2)] py-[var(--space-2)]'
            : 'flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between'
        }
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
          <span
            className="shrink-0 font-mono text-[length:var(--text-xs)] font-bold tracking-tight text-[var(--color-text)]"
            title={item.protocolo}
          >
            {item.protocolo}
          </span>
          <div className="flex flex-wrap items-center gap-[var(--space-1)]">
            {mostrarStatusProcesso ? (
              <ProcessoStatusBadge status={item.statusProcesso} size="sm" />
            ) : null}
            {statusSolicitacao ? <StatusBadge status={statusSolicitacao} size="sm" /> : null}
            {urgencia ? <UrgenciaBadge urgencia={urgencia} size="sm" /> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-[var(--space-2)]">
          {item.valorTotalEstimado > 0 ? (
            <span className="font-mono text-[length:var(--text-xs)] font-semibold tabular-nums text-[var(--color-success)]">
              {formatValorEstimadoProcesso(item.valorTotalEstimado)}
            </span>
          ) : null}
          <span
            className="hidden whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-text-subtle)] sm:inline"
            title={formatDateTimeFull(item.ultimaMovimentacaoEm)}
          >
            {formatRelativeTime(item.ultimaMovimentacaoEm)}
          </span>
          <ProcessoAcoesCelula
            item={item}
            podeNovaSolicitacao={podeNovaSolicitacao}
            dense
          />
        </div>
      </li>
    )
  }

  return (
    <div className="grid gap-[var(--space-3)] border-b border-[var(--color-border)] py-[var(--space-3)] last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] md:items-center md:gap-[var(--space-4)]">
      <span className="font-mono text-[length:var(--text-xs)] font-bold text-[var(--color-text)]">
        {item.protocolo}
      </span>
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        {mostrarStatusProcesso ? (
          <ProcessoStatusBadge status={item.statusProcesso} size="sm" />
        ) : null}
        {statusSolicitacao ? <StatusBadge status={statusSolicitacao} size="sm" /> : null}
      </div>
      <div>
        {urgencia ? (
          <UrgenciaBadge urgencia={urgencia} size="sm" />
        ) : (
          <span className="text-[var(--color-text-muted)]">—</span>
        )}
      </div>
      <span className="font-mono text-[length:var(--text-xs)] tabular-nums text-[var(--color-success)]">
        {formatValorEstimadoProcesso(item.valorTotalEstimado)}
      </span>
      <ProcessoSolicitacoesCelula solicitacoes={item.solicitacoes} />
      <span
        className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
        title={formatDateTimeFull(item.ultimaMovimentacaoEm)}
      >
        {formatRelativeTime(item.ultimaMovimentacaoEm)}
      </span>
      <div className="md:col-span-6 md:flex md:justify-end">
        <ProcessoAcoesCelula item={item} podeNovaSolicitacao={podeNovaSolicitacao} />
      </div>
    </div>
  )
}
