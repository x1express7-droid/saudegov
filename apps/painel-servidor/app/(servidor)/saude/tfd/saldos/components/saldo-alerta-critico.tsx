import type { SaldoListItem } from '@saude/mod-saude-tfd/client'

// BLOCO-11.1-SALDOS
interface SaldoAlertaCriticoProps {
  saldos: SaldoListItem[]
}

export function SaldoAlertaCritico({ saldos }: SaldoAlertaCriticoProps) {
  if (saldos.length === 0) {
    return null
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-error-light)] p-[var(--space-3)]">
      <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
        ⚠ Atenção: {saldos.length} saldo(s) com disponibilidade crítica (≤ 20%). Verifique antes
        de aprovar novas solicitações.
      </p>
      <ul className="mt-[var(--space-2)] list-inside list-disc text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        {saldos.map((saldo) => (
          <li key={saldo.id}>
            {saldo.descricao} — {saldo.percentualDisponivel.toFixed(1)}% disponível
          </li>
        ))}
      </ul>
    </div>
  )
}
