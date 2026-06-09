import type { SaldoListItem } from '@saude/mod-saude-tfd/client'
import { Badge } from '@saude/ui'

import { formatBrl } from './saldos-ui'

// BLOCO-11-SALDOS
interface SaldoResumoFinanceiroProps {
  saldo: SaldoListItem
}

function segmentWidth(value: number, total: number): number {
  if (total <= 0 || value <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, (value / total) * 100))
}

export function SaldoResumoFinanceiro({ saldo }: SaldoResumoFinanceiroProps) {
  const utilizadoPct = segmentWidth(saldo.valorUtilizado, saldo.valorTotal)
  const reservadoPct = segmentWidth(saldo.valorReservado, saldo.valorTotal)
  const disponivelPct = segmentWidth(saldo.valorDisponivel, saldo.valorTotal)
  const disponivelBadgeVariant = saldo.percentualDisponivel > 20 ? 'green' : 'red'

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)]">
          <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Valor total
          </p>
          <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-xl)] font-bold text-[var(--color-text)]">
            {formatBrl(saldo.valorTotal)}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)]">
          <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Reservado
          </p>
          <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
            {formatBrl(saldo.valorReservado)}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)]">
          <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Utilizado
          </p>
          <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
            {formatBrl(saldo.valorUtilizado)}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)]">
          <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Disponível
          </p>
          <div className="mt-[var(--space-2)] flex flex-wrap items-center gap-[var(--space-2)]">
            <p className="font-mono text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
              {formatBrl(saldo.valorDisponivel)}
            </p>
            <Badge variant={disponivelBadgeVariant} size="sm">
              {saldo.percentualDisponivel.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[var(--space-2)]">
        <div className="flex h-3 overflow-hidden rounded-full bg-[var(--color-bg)]">
          {utilizadoPct > 0 ? (
            <div
              className="bg-[var(--color-error)]"
              style={{ width: `${utilizadoPct}%` }}
              title={`Utilizado ${utilizadoPct.toFixed(1)}%`}
            />
          ) : null}
          {reservadoPct > 0 ? (
            <div
              className="bg-[var(--color-warning)]"
              style={{ width: `${reservadoPct}%` }}
              title={`Reservado ${reservadoPct.toFixed(1)}%`}
            />
          ) : null}
          {disponivelPct > 0 ? (
            <div
              className="bg-[var(--color-success)]"
              style={{ width: `${disponivelPct}%` }}
              title={`Disponível ${disponivelPct.toFixed(1)}%`}
            />
          ) : null}
        </div>
        <ul className="flex flex-wrap items-center gap-x-[var(--space-4)] gap-y-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          <li className="flex items-center gap-[var(--space-2)]">
            <span
              className="inline-block size-2.5 shrink-0 rounded-[2px] bg-[var(--color-error)]"
              aria-hidden="true"
            />
            Utilizado
          </li>
          <li className="flex items-center gap-[var(--space-2)]">
            <span
              className="inline-block size-2.5 shrink-0 rounded-[2px] bg-[var(--color-warning)]"
              aria-hidden="true"
            />
            Reservado
          </li>
          <li className="flex items-center gap-[var(--space-2)]">
            <span
              className="inline-block size-2.5 shrink-0 rounded-[2px] bg-[var(--color-success)]"
              aria-hidden="true"
            />
            Disponível
          </li>
        </ul>
      </div>
    </div>
  )
}
