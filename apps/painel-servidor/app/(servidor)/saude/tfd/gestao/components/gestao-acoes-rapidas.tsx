import { Button } from '@saude/ui'
import { BarChart3, CalendarDays, List, PlusCircle } from 'lucide-react'
import Link from 'next/link'

export interface GestaoAcoesRapidasProps {
  isGestorView: boolean
}

export function GestaoAcoesRapidas({ isGestorView }: GestaoAcoesRapidasProps) {
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <section aria-labelledby="gestao-acoes-rapidas">
      <h2
        id="gestao-acoes-rapidas"
        className="mb-[var(--space-3)] text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]"
      >
        Ações rápidas
      </h2>
      <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild variant="primary" className="h-auto min-h-[52px] justify-start py-[var(--space-3)]">
          <Link href="/saude/tfd/nova">
            <PlusCircle className="size-5 shrink-0" aria-hidden="true" />
            Nova Solicitação
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto min-h-[52px] justify-start py-[var(--space-3)]">
          <Link href="/saude/tfd/solicitacoes">
            <List className="size-5 shrink-0" aria-hidden="true" />
            Fila de Solicitações
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto min-h-[52px] justify-start py-[var(--space-3)]">
          <Link href={`/saude/tfd/agendamentos?dataInicio=${hoje}&dataFim=${hoje}`}>
            <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
            Agendamentos de Hoje
          </Link>
        </Button>
        {isGestorView ? (
          <Button asChild variant="secondary" className="h-auto min-h-[52px] justify-start py-[var(--space-3)]">
            <Link href="/saude/tfd/dashboard">
              <BarChart3 className="size-5 shrink-0" aria-hidden="true" />
              Dashboard Analítico
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  )
}
