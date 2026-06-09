import type { SaldoListItem } from '@saude/mod-saude-tfd/client'
import { Badge, Card } from '@saude/ui'

import { formatBrl } from './saldos-ui'

// BLOCO-11.1-SALDOS
interface SaldoListaResumoProps {
  items: SaldoListItem[]
}

export function SaldoListaResumo({ items }: SaldoListaResumoProps) {
  const saldosAtivos = items.filter((item) => item.ativo)
  const saldosEmAlerta = saldosAtivos.filter((item) => item.alertaBaixo)

  const totalDisponivel = saldosAtivos.reduce((sum, item) => sum + item.valorDisponivel, 0)
  const totalReservado = saldosAtivos.reduce((sum, item) => sum + item.valorReservado, 0)
  const totalUtilizado = saldosAtivos.reduce((sum, item) => sum + item.valorUtilizado, 0)

  const disponivelClassName =
    saldosEmAlerta.length > 0
      ? 'font-bold text-[length:var(--text-xl)] text-[var(--color-error)]'
      : 'font-bold text-[length:var(--text-xl)] text-[var(--color-success)]'

  return (
    <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-4">
      <Card bodyClassName="p-[var(--space-4)]">
        <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Total disponível
        </p>
        <p className={`mt-[var(--space-2)] font-mono ${disponivelClassName}`}>
          {formatBrl(totalDisponivel)}
        </p>
      </Card>
      <Card bodyClassName="p-[var(--space-4)]">
        <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Total reservado
        </p>
        <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-xl)] font-bold text-[var(--color-warning)]">
          {formatBrl(totalReservado)}
        </p>
      </Card>
      <Card bodyClassName="p-[var(--space-4)]">
        <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Total utilizado
        </p>
        <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-xl)] font-bold text-[var(--color-text)]">
          {formatBrl(totalUtilizado)}
        </p>
      </Card>
      <Card bodyClassName="p-[var(--space-4)]">
        <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Saldos ativos
        </p>
        <div className="mt-[var(--space-2)] flex flex-wrap items-center gap-[var(--space-2)]">
          <p className="font-mono text-[length:var(--text-xl)] font-bold text-[var(--color-text)]">
            {saldosAtivos.length}
          </p>
          {saldosEmAlerta.length > 0 ? (
            <Badge variant="red" size="sm">
              {saldosEmAlerta.length} em alerta
            </Badge>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
