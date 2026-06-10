'use client'

import { Badge, Button, TFD_URGENCIA_CONFIG, UrgenciaBadge, cn, type TfdUrgencia } from '@saude/ui'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, type KeyboardEvent } from 'react'

import { ProcessoItemDetalhe } from './processo-item-detalhe'
import { ProcessoPacienteIdentificacao } from './processo-paciente-identificacao'
import {
  formatDateTimeFull,
  formatPacienteCpf,
  formatPacienteTelefone,
  formatRelativeTime,
  formatValorEstimadoProcesso,
} from './processo-lista-utils'
import {
  labelProcessosAtivos,
  type ProcessoPacienteGrupo,
} from './processo-paciente-grupo'
import {
  PROCESSO_TABELA_ACOES_CELL_CLASS,
  PROCESSO_TABELA_CHEVRON_CELL_CLASS,
  PROCESSO_TABELA_DATA_CELL_CLASS,
  PROCESSO_TABELA_ROW_CLASS,
  PROCESSO_TABELA_TD_CLASS,
  PROCESSO_TABELA_VALOR_CELL_CLASS,
} from './processo-tabela-colunas'

// BLOCO-8-PROCESSOS
const PACIENTE_BASE = '/saude/tfd/pacientes'
const PROCESSOS_BASE = '/saude/tfd/processos'

function asTfdUrgencia(value: string | null): TfdUrgencia | null {
  if (!value || !(value in TFD_URGENCIA_CONFIG)) {
    return null
  }
  return value as TfdUrgencia
}

function muitoUrgenteChevronClassName(urgencia: string | null): string {
  return urgencia === 'MUITO_URGENTE' ? 'border-l-[3px] border-l-[var(--color-error)]' : ''
}

export interface ProcessoPacienteAccordionProps {
  grupo: ProcessoPacienteGrupo
  expanded: boolean
  onToggle: () => void
  podeNovaSolicitacao: boolean
  mostrarEncerrados: boolean
  variant?: 'card' | 'table-row'
  mostrarStatusProcesso?: boolean
}

export function ProcessoPacienteAccordion({
  grupo,
  expanded,
  onToggle,
  podeNovaSolicitacao,
  mostrarEncerrados,
  variant = 'card',
  mostrarStatusProcesso = false,
}: ProcessoPacienteAccordionProps) {
  const [encerradosAbertos, setEncerradosAbertos] = useState(false)
  const totalAtivos = grupo.processosAtivos.length
  const totalEncerrados = grupo.processosEncerrados.length
  const processosPrincipais = useMemo(() => {
    if (grupo.processosAtivos.length > 0) {
      return grupo.processosAtivos
    }
    return mostrarEncerrados ? grupo.processosEncerrados : []
  }, [grupo.processosAtivos, grupo.processosEncerrados, mostrarEncerrados])
  const urgencia = asTfdUrgencia(grupo.urgenciaMaisCritica)
  const unicoProcesso = processosPrincipais.length === 1 ? processosPrincipais[0]! : null
  const podeExpandir = processosPrincipais.length > 1
  const somenteEncerrados = totalAtivos === 0 && totalEncerrados > 0
  const valorTotalGrupo = processosPrincipais.reduce(
    (acc, processo) => acc + processo.valorTotalEstimado,
    0
  )

  const containerClassName = cn(
    'overflow-hidden bg-[var(--color-surface)]',
    variant === 'card' &&
      'rounded-[var(--radius)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]',
    variant === 'card' && muitoUrgenteChevronClassName(grupo.urgenciaMaisCritica)
  )

  const headerClassName = cn(
    'w-full px-[var(--space-3)] py-[var(--space-2)] text-left transition-colors',
    variant === 'card' && 'flex items-center gap-[var(--space-2)]',
    podeExpandir && variant === 'card' && 'cursor-pointer'
  )

  const tableRowClassName = cn(
    PROCESSO_TABELA_ROW_CLASS,
    podeExpandir && 'cursor-pointer'
  )

  function handleHeaderClick() {
    if (!podeExpandir) {
      return
    }
    onToggle()
  }

  function handleHeaderKeyDown(event: KeyboardEvent) {
    if (!podeExpandir) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle()
    }
  }

  const chevron = podeExpandir ? (
    expanded ? (
      <ChevronDown className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
    ) : (
      <ChevronRight className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
    )
  ) : (
    <span className="size-4 shrink-0" aria-hidden="true" />
  )

  const badgeContagem = somenteEncerrados ? (
    <Badge variant="slate" size="sm">
      {totalEncerrados} encerrado{totalEncerrados === 1 ? '' : 's'}
    </Badge>
  ) : (
    <Badge variant="gray" size="sm">
      {labelProcessosAtivos(totalAtivos)}
    </Badge>
  )

  const badgesProcessos = (
    <div className="flex flex-wrap items-center gap-[var(--space-1)]">
      {badgeContagem}
      {mostrarEncerrados && totalAtivos > 0 && totalEncerrados > 0 ? (
        <Badge variant="slate" size="sm">
          +{totalEncerrados}
        </Badge>
      ) : null}
    </div>
  )

  const botaoVerUnico =
    !podeExpandir && unicoProcesso ? (
      <Button
        variant="outline"
        asChild
        className="h-8 min-h-8 shrink-0 px-2.5 text-[length:var(--text-xs)]"
        onClick={(event) => event.stopPropagation()}
      >
        <Link href={`${PROCESSOS_BASE}/${unicoProcesso.processoId}`}>Ver</Link>
      </Button>
    ) : null

  const tableRowInner = (
    <>
      <td
        className={cn(
          PROCESSO_TABELA_CHEVRON_CELL_CLASS,
          muitoUrgenteChevronClassName(grupo.urgenciaMaisCritica)
        )}
      >
        {chevron}
      </td>
      <td className={PROCESSO_TABELA_TD_CLASS}>
        <div className={PROCESSO_TABELA_DATA_CELL_CLASS}>
          {grupo.pacienteId ? (
            <Link
              href={`${PACIENTE_BASE}/${grupo.pacienteId}`}
              className="truncate font-semibold text-[var(--color-primary)] hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {grupo.pacienteNome}
            </Link>
          ) : (
            <span className="truncate font-semibold">{grupo.pacienteNome}</span>
          )}
        </div>
      </td>
      <td className={PROCESSO_TABELA_TD_CLASS}>
        <span className="truncate font-mono text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          {formatPacienteCpf(grupo.pacienteCpf)}
        </span>
      </td>
      <td className={PROCESSO_TABELA_TD_CLASS}>
        <span className="truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          {formatPacienteTelefone(grupo.pacienteTelefone)}
        </span>
      </td>
      <td className={PROCESSO_TABELA_TD_CLASS}>{badgesProcessos}</td>
      <td className={PROCESSO_TABELA_TD_CLASS}>
        {urgencia ? <UrgenciaBadge urgencia={urgencia} size="sm" /> : <span>—</span>}
      </td>
      <td className={PROCESSO_TABELA_TD_CLASS}>
        <span
          className={`${PROCESSO_TABELA_VALOR_CELL_CLASS} ${
            valorTotalGrupo > 0
              ? 'font-semibold text-[var(--color-success)]'
              : 'text-[var(--color-text-muted)]'
          }`}
          title="Total estimado dos processos listados"
        >
          {formatValorEstimadoProcesso(valorTotalGrupo)}
        </span>
      </td>
      <td className={PROCESSO_TABELA_TD_CLASS}>
        <span
          className="block truncate text-right text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
          title={formatDateTimeFull(grupo.ultimaMovimentacaoEm)}
        >
          {formatRelativeTime(grupo.ultimaMovimentacaoEm)}
        </span>
      </td>
      <td className={cn(PROCESSO_TABELA_TD_CLASS, PROCESSO_TABELA_ACOES_CELL_CLASS)}>
        {botaoVerUnico}
      </td>
    </>
  )

  const headerInner =
    variant === 'table-row' ? null : (
      <>
        {chevron}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
          <ProcessoPacienteIdentificacao
            pacienteId={grupo.pacienteId}
            nome={grupo.pacienteNome}
            cpf={grupo.pacienteCpf}
            telefone={grupo.pacienteTelefone}
            onClickStopPropagation
            layout="inline"
          />
          {badgesProcessos}
        </div>
        <div className="flex shrink-0 items-center gap-[var(--space-2)]">
          {urgencia ? <UrgenciaBadge urgencia={urgencia} size="sm" /> : null}
          <span
            className="hidden whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-text-muted)] sm:inline"
            title={formatDateTimeFull(grupo.ultimaMovimentacaoEm)}
          >
            {formatRelativeTime(grupo.ultimaMovimentacaoEm)}
          </span>
          {!podeExpandir && unicoProcesso ? (
            <Button
              variant="outline"
              asChild
              className="h-8 min-h-8 shrink-0 px-2.5 text-[length:var(--text-xs)]"
              onClick={(event) => event.stopPropagation()}
            >
              <Link href={`${PROCESSOS_BASE}/${unicoProcesso.processoId}`}>Ver</Link>
            </Button>
          ) : null}
        </div>
      </>
    )

  const listaProcessos =
    variant === 'table-row'
      ? processosPrincipais.map((processo) => (
          <ProcessoItemDetalhe
            key={processo.processoId}
            item={processo}
            podeNovaSolicitacao={podeNovaSolicitacao}
            tableRowLayout
            mostrarStatusProcesso={somenteEncerrados || mostrarStatusProcesso}
          />
        ))
      : (
          <ul className="divide-y divide-[var(--color-border)]">
            {processosPrincipais.map((processo) => (
              <ProcessoItemDetalhe
                key={processo.processoId}
                item={processo}
                podeNovaSolicitacao={podeNovaSolicitacao}
                embedded
                mostrarStatusProcesso={somenteEncerrados || mostrarStatusProcesso}
              />
            ))}
          </ul>
        )

  if (variant === 'table-row') {
    return (
      <>
        <tr
          className={tableRowClassName}
          onClick={podeExpandir ? handleHeaderClick : undefined}
          onKeyDown={podeExpandir ? handleHeaderKeyDown : undefined}
          tabIndex={podeExpandir ? 0 : undefined}
          role={podeExpandir ? 'button' : undefined}
          aria-expanded={podeExpandir ? expanded : undefined}
        >
          {tableRowInner}
        </tr>

        {expanded && podeExpandir ? (
          <>
            {listaProcessos}

            {mostrarEncerrados && totalAtivos > 0 && totalEncerrados > 0 ? (
              <>
                <tr className="bg-[var(--color-bg)]">
                  <td colSpan={9} className="px-[var(--space-3)] py-[var(--space-1)]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-[var(--space-1)] py-[var(--space-1)] text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      onClick={() => setEncerradosAbertos((current) => !current)}
                      aria-expanded={encerradosAbertos}
                    >
                      {encerradosAbertos ? (
                        <ChevronDown className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                      )}
                      Encerrados ({totalEncerrados})
                    </button>
                  </td>
                </tr>
                {encerradosAbertos
                  ? grupo.processosEncerrados.map((processo) => (
                      <ProcessoItemDetalhe
                        key={processo.processoId}
                        item={processo}
                        podeNovaSolicitacao={podeNovaSolicitacao}
                        tableRowLayout
                        mostrarStatusProcesso
                      />
                    ))
                  : null}
              </>
            ) : null}
          </>
        ) : null}
      </>
    )
  }

  return (
    <div className={containerClassName}>
      {podeExpandir ? (
        <button
          type="button"
          className={headerClassName}
          onClick={handleHeaderClick}
          onKeyDown={handleHeaderKeyDown}
          aria-expanded={expanded}
        >
          {headerInner}
        </button>
      ) : (
        <div className={headerClassName}>{headerInner}</div>
      )}

      {expanded && podeExpandir ? (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-3)] pb-[var(--space-1)] pl-[calc(var(--space-3)+1.25rem)]">
          {listaProcessos}

          {mostrarEncerrados && totalAtivos > 0 && totalEncerrados > 0 ? (
            <div className="border-t border-[var(--color-border)] pt-[var(--space-1)]">
              <button
                type="button"
                className="flex w-full items-center gap-[var(--space-1)] py-[var(--space-1)] text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                onClick={() => setEncerradosAbertos((current) => !current)}
                aria-expanded={encerradosAbertos}
              >
                {encerradosAbertos ? (
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                )}
                Encerrados ({totalEncerrados})
              </button>
              {encerradosAbertos ? (
                <ul className="divide-y divide-[var(--color-border)]">
                  {grupo.processosEncerrados.map((processo) => (
                    <ProcessoItemDetalhe
                      key={processo.processoId}
                      item={processo}
                      podeNovaSolicitacao={podeNovaSolicitacao}
                      embedded
                      mostrarStatusProcesso
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
