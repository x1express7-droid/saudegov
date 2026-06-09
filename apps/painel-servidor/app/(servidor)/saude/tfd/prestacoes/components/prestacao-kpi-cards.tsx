'use client'

import type { TfdPrestacaoListItem } from '@saude/mod-saude-tfd/client'
import { Card } from '@saude/ui'
import { AlertTriangle, Clock, Search, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { computePrestacaoKpis } from './prestacao-utils'

// BLOCO-14-PRESTACOES
interface PrestacaoKpiCardsProps {
  items: TfdPrestacaoListItem[]
}

interface KpiCardConfig {
  titulo: string
  valor: number
  subtexto: string
  icon: ReactNode
  valorClassName: string
}

export function PrestacaoKpiCards({ items }: PrestacaoKpiCardsProps) {
  const kpis = useMemo(() => computePrestacaoKpis(items), [items])

  const cards: KpiCardConfig[] = [
    {
      titulo: 'Pendentes',
      valor: kpis.pendentes,
      subtexto: 'Aguardando lançamento de despesas',
      icon: <Clock className="size-6" aria-hidden="true" />,
      valorClassName: 'text-[var(--color-warning)]',
    },
    {
      titulo: 'Aguardando envio',
      valor: kpis.aguardandoEnvio,
      subtexto: 'Prazo vencendo em até 5 dias',
      icon: <AlertTriangle className="size-6" aria-hidden="true" />,
      valorClassName:
        kpis.aguardandoEnvio > 0
          ? 'text-[var(--color-orange)]'
          : 'text-[var(--color-text-muted)]',
    },
    {
      titulo: 'Em análise',
      valor: kpis.emAnalise,
      subtexto: 'Enviadas para o gestor',
      icon: <Search className="size-6" aria-hidden="true" />,
      valorClassName: 'text-[var(--color-info)]',
    },
    {
      titulo: 'Vencidas',
      valor: kpis.vencidas,
      subtexto: 'Prazo de envio expirado',
      icon: <XCircle className="size-6" aria-hidden="true" />,
      valorClassName:
        kpis.vencidas > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]',
    },
  ]

  const exibirAlerta = kpis.vencidas > 0 || kpis.aguardandoEnvio > 0

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.titulo} bodyClassName="p-[var(--space-4)]">
            <div className="flex items-start justify-between gap-[var(--space-3)]">
              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
                  {card.titulo}
                </p>
                <p
                  className={`mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums ${card.valorClassName}`}
                >
                  {card.valor.toLocaleString('pt-BR')}
                </p>
                <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {card.subtexto}
                </p>
              </div>
              <span className="shrink-0 text-[var(--color-text-muted)]">{card.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {exibirAlerta ? (
        <div
          className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-error-light)] p-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text)]"
          role="alert"
        >
          ⚠ Há prestações com prazo crítico. Envie as pendentes antes que o prazo expire.
        </div>
      ) : null}
    </div>
  )
}
