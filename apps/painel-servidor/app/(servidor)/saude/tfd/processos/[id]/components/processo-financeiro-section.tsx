'use client'

import type { ProcessoFinanceiroOutput } from '@saude/mod-saude-tfd/client'

import { labelTipoDespesa } from '@/app/(servidor)/saude/tfd/components/despesa-tipo-utils'
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ProtocoloBadge,
  StatusBadge,
  cn,
  formatDateTimeBr,
  type TfdStatus,
} from '@saude/ui'
import { ArrowLeftRight, CheckCircle2, Link2, Wallet } from 'lucide-react'
import Link from 'next/link'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

function isTfdStatus(value: string): value is TfdStatus {
  const statuses: Record<string, true> = {
    RASCUNHO: true,
    ENVIADO: true,
    EM_ANALISE: true,
    PENDENTE: true,
    APROVADO: true,
    NEGADO: true,
    AGENDADO: true,
    EM_VIAGEM: true,
    AGUARDANDO_PC: true,
    PC_EM_ANALISE: true,
    CONCLUIDO: true,
    CANCELADO: true,
  }
  return value in statuses
}

function labelTipoAtendimento(tipo: string): string {
  return TIPO_ATENDIMENTO_LABEL[tipo] ?? tipo
}

function KpiCard({
  label,
  value,
  hint,
  accent = 'neutral',
}: {
  label: string
  value: React.ReactNode
  hint?: string
  accent?: 'success' | 'warning' | 'neutral'
}) {
  const accentStyles = {
    success:
      'border-[color-mix(in_srgb,var(--color-success)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_7%,var(--color-surface))]',
    warning:
      'border-[color-mix(in_srgb,var(--color-warning)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_6%,var(--color-surface))]',
    neutral: 'border-[var(--color-border)] bg-[var(--color-surface)]',
  }

  const valueStyles = {
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-text)]',
    neutral: 'text-[var(--color-text)]',
  }

  return (
    <div className={cn('rounded-[var(--radius-md)] border p-[var(--space-4)]', accentStyles[accent])}>
      <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-[var(--space-2)] font-mono text-[length:var(--text-xl)] font-bold tabular-nums',
          valueStyles[accent]
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export interface ProcessoFinanceiroSectionProps {
  financeiro: ProcessoFinanceiroOutput
}

export function ProcessoFinanceiroSection({ financeiro }: ProcessoFinanceiroSectionProps) {
  const temAlgumCusto = financeiro.solicitacoesComCusto > 0

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <Card
        header={
          <CardHeader className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
            <div className="flex items-center gap-[var(--space-2)]">
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface))] text-[var(--color-success)]">
                <Wallet className="size-4" aria-hidden="true" />
              </span>
              <span>Resumo financeiro</span>
            </div>
            {temAlgumCusto ? (
              <Badge variant="green" size="sm" className="font-mono tabular-nums">
                {currencyFormatter.format(financeiro.totalEstimadoProcesso)}
              </Badge>
            ) : null}
          </CardHeader>
        }
        className="border-l-4 border-l-[var(--color-success)]"
      >
        <div className="grid gap-[var(--space-4)] sm:grid-cols-3">
          <KpiCard
            label="Custo estimado total"
            value={currencyFormatter.format(financeiro.totalEstimadoProcesso)}
            hint="Soma das despesas lançadas"
            accent="success"
          />
          <KpiCard
            label="Total reservado"
            value={currencyFormatter.format(financeiro.totalReservado)}
            hint="Valores com reserva ativa no saldo"
            accent="warning"
          />
          <KpiCard
            label="Solicitações com despesas"
            value={
              <>
                <span
                  className={cn(
                    financeiro.solicitacoesComCusto > 0 && 'text-[var(--color-success)]'
                  )}
                >
                  {financeiro.solicitacoesComCusto}
                </span>
                <span className="text-[length:var(--text-base)] font-normal text-[var(--color-text-muted)]">
                  {' '}
                  / {financeiro.solicitacoes.length}
                </span>
              </>
            }
            accent="neutral"
          />
        </div>
      </Card>

      {financeiro.solicitacoes.length === 0 ? (
        <EmptyState
          titulo="Nenhuma solicitação vinculada"
          descricao="As despesas e reservas de saldo aparecerão aqui quando houver solicitações neste processo."
        />
      ) : (
        <ul className="flex flex-col gap-[var(--space-4)]">
          {financeiro.solicitacoes.map((item) => (
            <li key={item.solicitacaoId}>
              <Card
                bodyClassName="p-0"
                className={cn(
                  item.valorTotalEstimado > 0 &&
                    'border-[color-mix(in_srgb,var(--color-success)_18%,var(--color-border))]'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)] border-b border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-4)]">
                  <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-2)]">
                    <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                      <ProtocoloBadge protocolo={item.protocolo} />
                      {isTfdStatus(item.status) ? (
                        <StatusBadge status={item.status} size="sm" />
                      ) : (
                        <Badge variant="gray" size="sm">
                          {item.status}
                        </Badge>
                      )}
                      <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                        {labelTipoAtendimento(item.tipoAtendimento)}
                      </span>
                      {item.projecaoConfirmada ? (
                        <Badge variant="green" size="sm">
                          <CheckCircle2 className="size-3" aria-hidden="true" />
                          Reserva confirmada
                        </Badge>
                      ) : (
                        <Badge variant="gray" size="sm">
                          Sem reserva
                        </Badge>
                      )}
                    </div>
                    <Link
                      href={`/saude/tfd/${item.solicitacaoId}`}
                      className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Ver solicitação
                    </Link>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] text-right">
                    <p className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                      Estimado
                    </p>
                    <p
                      className={cn(
                        'font-mono text-[length:var(--text-lg)] font-bold tabular-nums',
                        item.valorTotalEstimado > 0
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-text-muted)]'
                      )}
                    >
                      {currencyFormatter.format(item.valorTotalEstimado)}
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--color-bg)] px-[var(--space-4)] py-[var(--space-4)]">
                  <h4 className="mb-[var(--space-3)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Vínculos financeiros
                  </h4>
                  <dl className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-3">
                    {item.solicitacaoOrigem ? (
                      <div>
                        <dt className="flex items-center gap-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                          <ArrowLeftRight className="size-3" aria-hidden="true" />
                          Retorno de
                        </dt>
                        <dd className="mt-1">
                          <Link
                            href={`/saude/tfd/${item.solicitacaoOrigem.id}`}
                            className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {item.solicitacaoOrigem.protocolo}
                          </Link>
                        </dd>
                      </div>
                    ) : null}

                    <div>
                      <dt className="flex items-center gap-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                        <Link2 className="size-3" aria-hidden="true" />
                        Saldo vinculado
                      </dt>
                      <dd className="mt-1 text-[length:var(--text-sm)]">
                        {item.saldoVinculado ? (
                          <Link
                            href={`/saude/tfd/saldos/${item.saldoVinculado.id}`}
                            className="font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {item.saldoVinculado.descricao}
                          </Link>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">Não vinculado</span>
                        )}
                      </dd>
                    </div>

                    {item.reservaAtiva ? (
                      <>
                        <div>
                          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            Reserva ativa
                          </dt>
                          <dd className="mt-1 flex flex-wrap items-center gap-[var(--space-2)]">
                            <span className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-success)]">
                              {currencyFormatter.format(item.reservaAtiva.valor)}
                            </span>
                            <Badge variant="green" size="sm">
                              {item.reservaAtiva.status}
                            </Badge>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            Saldo da reserva
                          </dt>
                          <dd className="mt-1 text-[length:var(--text-sm)]">
                            <Link
                              href={`/saude/tfd/saldos/${item.reservaAtiva.saldoId}`}
                              className="font-medium text-[var(--color-primary)] hover:underline"
                            >
                              {item.reservaAtiva.saldoDescricao}
                            </Link>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            Confirmada em
                          </dt>
                          <dd className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text)]">
                            {formatDateTimeBr(
                              item.reservaAtiva.confirmadaEm,
                              item.reservaAtiva.confirmadaEm
                            )}
                          </dd>
                        </div>
                      </>
                    ) : (
                      <div>
                        <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                          Reserva de saldo
                        </dt>
                        <dd className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                          Sem reserva ativa
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {item.custos.length > 0 ? (
                  <div className="px-[var(--space-4)] py-[var(--space-4)]">
                    <h4 className="mb-[var(--space-3)] flex items-center gap-[var(--space-2)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      <span
                        className="inline-block size-2 rounded-full bg-[var(--color-success)]"
                        aria-hidden="true"
                      />
                      Despesas lançadas ({item.custos.length})
                    </h4>
                    <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                      {item.custos.map((custo) => {
                        const tipoDespesa = labelTipoDespesa(custo.tipo)
                        const Icon = tipoDespesa.Icon
                        const labelComDias =
                          custo.quantidadeDias !== null && custo.quantidadeDias > 0
                            ? `${tipoDespesa.label} (${custo.quantidadeDias} dia${custo.quantidadeDias === 1 ? '' : 's'})`
                            : tipoDespesa.label

                        return (
                          <li
                            key={custo.id}
                            className="flex flex-wrap items-center justify-between gap-[var(--space-3)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-3)] first:rounded-t-[var(--radius-md)] last:rounded-b-[var(--radius-md)]"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-[var(--space-3)]">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))] text-[var(--color-success)]">
                                <Icon className="size-4" aria-hidden="true" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                                  {labelComDias}
                                </p>
                                {custo.descricao ? (
                                  <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                    {custo.descricao}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <span className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-success)]">
                              {currencyFormatter.format(custo.valor)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="border-t border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    Nenhuma despesa lançada nesta solicitação.
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
