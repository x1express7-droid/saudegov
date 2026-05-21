import type { SaldoListItem } from '@saude/mod-saude-tfd'
import { Badge } from '@saude/ui'
import { formatBrl } from './tfd-saldos-ui'

interface TfdExtratoResumoProps {
  saldo: SaldoListItem
}

export function TfdExtratoResumo({ saldo }: TfdExtratoResumoProps) {
  return (
    <div
      className={`mb-[var(--space-4)] grid gap-[var(--space-3)] rounded-[var(--radius)] border p-[var(--space-4)] text-[length:var(--text-sm)] sm:grid-cols-2 lg:grid-cols-4 ${
        saldo.alertaBaixo
          ? 'border-[var(--color-warning)] bg-[var(--color-warning-light)]'
          : 'border-[var(--color-border)] bg-[var(--color-bg)]'
      }`}
    >
      <div>
        <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Valor total
        </p>
        <p className="mt-[var(--space-1)] font-mono text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          {formatBrl(saldo.valorTotal)}
        </p>
      </div>
      <div>
        <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Reservado
        </p>
        <p className="mt-[var(--space-1)] font-mono text-[var(--color-text)]">
          {formatBrl(saldo.valorReservado)}
        </p>
      </div>
      <div>
        <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Utilizado
        </p>
        <p className="mt-[var(--space-1)] font-mono text-[var(--color-text)]">
          {formatBrl(saldo.valorUtilizado)}
        </p>
      </div>
      <div>
        <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Disponível
        </p>
        <p
          className={`mt-[var(--space-1)] font-mono text-[length:var(--text-base)] font-semibold ${
            saldo.alertaBaixo ? 'text-[var(--color-warning)]' : 'text-[var(--color-text)]'
          }`}
        >
          {formatBrl(saldo.valorDisponivel)}
          <span className="ml-1 text-[length:var(--text-xs)] font-normal text-[var(--color-text-muted)]">
            ({saldo.percentualDisponivel.toFixed(1)}%)
          </span>
        </p>
        {saldo.alertaBaixo ? (
          <Badge variant="yellow" size="sm" className="mt-[var(--space-2)] w-fit">
            Saldo abaixo de 20%
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

export function TfdExtratoResumoSkeleton() {
  return (
    <div
      className="mb-[var(--space-4)] grid gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-[var(--space-2)]">
          <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="h-5 w-28 animate-pulse rounded bg-[var(--color-border)]" />
        </div>
      ))}
    </div>
  )
}
