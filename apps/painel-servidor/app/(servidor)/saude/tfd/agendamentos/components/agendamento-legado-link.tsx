'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

// BLOCO-9-AGENDAMENTOS
export function AgendamentoLegadoLink() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fonte = searchParams.get('fonte') === 'viagens' ? 'viagens' : 'consultas'

  function buildHref(nextFonte: 'consultas' | 'viagens'): string {
    const next = new URLSearchParams(searchParams.toString())
    next.set('fonte', nextFonte)
    next.delete('page')
    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  if (fonte === 'viagens') {
    return (
      <Link
        href={buildHref('consultas')}
        className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline"
      >
        ← Voltar aos agendamentos atuais
      </Link>
    )
  }

  return (
    <Link
      href={buildHref('viagens')}
      className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline"
    >
      Ver registros históricos (modelo anterior) →
    </Link>
  )
}
