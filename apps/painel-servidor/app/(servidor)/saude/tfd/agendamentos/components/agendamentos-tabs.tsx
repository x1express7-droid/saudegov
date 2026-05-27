'use client'

import { cn } from '@saude/ui'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

export type AgendamentosFonte = 'consultas' | 'viagens'

export function AgendamentosTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fonte = searchParams.get('fonte') === 'viagens' ? 'viagens' : 'consultas'

  function hrefPara(tab: AgendamentosFonte): string {
    const next = new URLSearchParams(searchParams.toString())
    if (tab === 'consultas') {
      next.set('fonte', 'consultas')
    } else {
      next.set('fonte', 'viagens')
    }
    next.delete('page')
    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const tabs: { id: AgendamentosFonte; label: string }[] = [
    { id: 'consultas', label: 'Agendamentos' },
    { id: 'viagens', label: 'Viagens legadas' },
  ]

  return (
    <nav
      className="flex flex-wrap gap-[var(--space-2)] border-b border-[var(--color-border)]"
      aria-label="Fonte da listagem"
    >
      {tabs.map((tab) => {
        const ativo = fonte === tab.id
        return (
          <Link
            key={tab.id}
            href={hrefPara(tab.id)}
            className={cn(
              '-mb-px border-b-2 px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium transition-colors',
              ativo
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            )}
            aria-current={ativo ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
