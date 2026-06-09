import type { SaldoListItem } from '@saude/mod-saude-tfd/client'

import { saldoSegmentWidth } from './saldos-ui'

// BLOCO-11.1-SALDOS
interface SaldoLinhaProgressoProps {
  saldo: Pick<SaldoListItem, 'valorTotal' | 'valorUtilizado' | 'valorReservado' | 'valorDisponivel'>
}

export function SaldoLinhaProgresso({ saldo }: SaldoLinhaProgressoProps) {
  const utilizadoPct = saldoSegmentWidth(saldo.valorUtilizado, saldo.valorTotal)
  const reservadoPct = saldoSegmentWidth(saldo.valorReservado, saldo.valorTotal)
  const disponivelPct = saldoSegmentWidth(saldo.valorDisponivel, saldo.valorTotal)

  if (saldo.valorTotal <= 0) {
    return null
  }

  return (
    <div className="mt-[var(--space-2)] flex h-1.5 w-full min-w-[8rem] overflow-hidden rounded-full bg-[var(--color-bg)]">
      {utilizadoPct > 0 ? (
        <div className="bg-[var(--color-error)]" style={{ width: `${utilizadoPct}%` }} />
      ) : null}
      {reservadoPct > 0 ? (
        <div className="bg-[var(--color-warning)]" style={{ width: `${reservadoPct}%` }} />
      ) : null}
      {disponivelPct > 0 ? (
        <div className="bg-[var(--color-success)]" style={{ width: `${disponivelPct}%` }} />
      ) : null}
    </div>
  )
}
