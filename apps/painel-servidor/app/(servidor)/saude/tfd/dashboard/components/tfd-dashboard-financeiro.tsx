import {
  labelTipoMovimentacao,
  type TfdDashboardFinanceiroOutput,
} from '@saude/mod-saude-tfd/client'
import { Alert, Card, EmptyState } from '@saude/ui'
import { ArrowRight, Wallet } from 'lucide-react'
import Link from 'next/link'

const SALDOS_HREF = '/saude/tfd/saldos'

export interface TfdDashboardFinanceiroProps {
  financeiro: TfdDashboardFinanceiroOutput
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TfdDashboardFinanceiro({ financeiro }: TfdDashboardFinanceiroProps) {
  const { totalDisponivelConsolidado, saldosEmAlerta, extratoResumido, quantidadeSaldosAtivos } =
    financeiro

  return (
    <section className="flex flex-col gap-[var(--space-4)]" aria-labelledby="tfd-financeiro-titulo">
      <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
        <h2
          id="tfd-financeiro-titulo"
          className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]"
        >
          Financeiro
        </h2>
        <Link
          href={SALDOS_HREF}
          className="inline-flex items-center gap-1 text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Ver saldos
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <Card className="border-l-4 border-l-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))]">
        <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
          Saldo disponível consolidado
        </p>
        <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-primary)]">
          {formatMoeda(totalDisponivelConsolidado)}
        </p>
        <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          {quantidadeSaldosAtivos === 0
            ? 'Nenhum saldo financeiro ativo cadastrado.'
            : quantidadeSaldosAtivos === 1
              ? '1 saldo ativo no município.'
              : `${quantidadeSaldosAtivos} saldos ativos no município.`}
        </p>
      </Card>

      {saldosEmAlerta.length > 0 ? (
        <Alert
          variant="warning"
          titulo={
            saldosEmAlerta.length === 1
              ? '1 saldo com disponível abaixo de 20%'
              : `${saldosEmAlerta.length} saldos com disponível abaixo de 20%`
          }
          role="alert"
        >
          <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
            {saldosEmAlerta.map((saldo) => (
              <li key={saldo.id}>
                <Link
                  href={SALDOS_HREF}
                  className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
                >
                  {saldo.descricao}
                </Link>
                <span className="text-[var(--color-text)]">
                  {' '}
                  — disponível {formatMoeda(saldo.valorDisponivel)} (
                  {saldo.percentualDisponivel.toFixed(1)}% do total)
                </span>
              </li>
            ))}
          </ul>
        </Alert>
      ) : quantidadeSaldosAtivos > 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhum saldo ativo abaixo do limite de 20% de disponibilidade.
        </p>
      ) : null}

      <Card
        header={
          <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
            Últimas movimentações
          </h3>
        }
      >
        {extratoResumido.length === 0 ? (
          <EmptyState
            icon={<Wallet className="size-6" aria-hidden="true" />}
            titulo="Sem movimentações recentes"
            descricao="As movimentações dos saldos ativos aparecerão aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-[length:var(--text-sm)]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 font-medium">Descrição</th>
                  <th className="py-2 pr-3 font-medium">Saldo</th>
                  <th className="py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {extratoResumido.map((mov) => (
                  <tr
                    key={mov.id}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-text-muted)]">
                      {formatDataHora(mov.criadoEm)}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text)]">
                      {labelTipoMovimentacao(mov.tipo)}
                    </td>
                    <td className="py-2 pr-3 max-w-[12rem] truncate text-[var(--color-text)]">
                      {mov.descricao}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text-muted)]">
                      {mov.saldoDescricao}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-[var(--color-text)]">
                      {formatMoeda(mov.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  )
}
