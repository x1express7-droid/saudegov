import { Card } from '@saude/ui'
import { Bus, Calendar, DollarSign, FileText, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

// BLOCO-13-RELATORIOS
interface RelatorioHubCard {
  href: string
  icon: LucideIcon
  titulo: string
  descricao: string
}

const HUB_CARDS: RelatorioHubCard[] = [
  {
    href: '/saude/tfd/relatorios/solicitacoes',
    icon: FileText,
    titulo: 'Solicitações',
    descricao: 'Volume por status, urgência e tempo médio de aprovação.',
  },
  {
    href: '/saude/tfd/relatorios/financeiro',
    icon: DollarSign,
    titulo: 'Financeiro',
    descricao: 'Saldos, reservas, consumo e prestações de contas.',
  },
  {
    href: '/saude/tfd/relatorios/viagens',
    icon: Bus,
    titulo: 'Viagens',
    descricao: 'Deslocamentos realizados, passageiros e motoristas.',
  },
  {
    href: '/saude/tfd/relatorios/agendamentos',
    icon: Calendar,
    titulo: 'Agendamentos',
    descricao: 'Consultas agendadas por período e status.',
  },
]

export function RelatorioHubView() {
  return (
    <div className="grid gap-[var(--space-4)] grid-cols-2 md:grid-cols-3">
      {HUB_CARDS.map((card) => {
        const Icon = card.icon

        return (
          <Link
            key={card.href}
            href={card.href}
            className="block transition-shadow hover:shadow-md"
          >
            <Card className="h-full cursor-pointer transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]">
              <div className="flex flex-col gap-[var(--space-3)]">
                <Icon className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
                <div>
                  <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
                    {card.titulo}
                  </h2>
                  <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    {card.descricao}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
