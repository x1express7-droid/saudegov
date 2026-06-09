'use client'

import type { TfdPrestacaoListItem } from '@saude/mod-saude-tfd/client'
import { Badge, Button, ProtocoloBadge } from '@saude/ui'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { PrestacaoStatusBadge } from './prestacao-status-badge'
import {
  diasAtePrazo,
  formatDataPrazo,
  getPrazoDestaque,
  labelDespesas,
  labelValorTotal,
  prestacaoDetalheHref,
  prazoBadgeVariant,
  prazoDestaqueClassName,
  protocoloPc,
} from './prestacao-utils'

// BLOCO-14-PRESTACOES
export interface PrestacaoTabelaViewProps {
  items: TfdPrestacaoListItem[]
}

export function PrestacaoTabelaView({ items }: PrestacaoTabelaViewProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="w-full min-w-[56rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            {[
              'Protocolo',
              'Paciente',
              'Viagem',
              'Prazo',
              'Despesas',
              'Valor total',
              'Status',
              'Ação',
            ].map((header) => (
              <th
                key={header}
                scope="col"
                className="px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const destaque = getPrazoDestaque(item)
            const dias = diasAtePrazo(item.prazoEnvioAt)
            const valorLabel = labelValorTotal(item)

            return (
              <tr
                key={item.id}
                className={`border-b border-[var(--color-border)] last:border-b-0 ${prazoDestaqueClassName(destaque)}`}
              >
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  <ProtocoloBadge
                    protocolo={protocoloPc(item)}
                    className="max-w-full [&_.protocolo]:font-mono [&_.protocolo]:text-xs [&_.protocolo]:font-bold [&_.protocolo]:whitespace-nowrap"
                  />
                </td>
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                    {item.paciente.nome}
                  </span>
                </td>
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  <Link
                    href={prestacaoDetalheHref(item.viagemId)}
                    className="font-mono text-[length:var(--text-xs)] text-[var(--color-primary)] hover:underline"
                  >
                    {item.viagemProtocolo}
                  </Link>
                </td>
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  <Badge variant={prazoBadgeVariant(dias)} size="sm">
                    {formatDataPrazo(item.prazoEnvioAt)}
                  </Badge>
                </td>
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  {item.quantidadeItens === 0 ? (
                    <Badge variant="red" size="sm">
                      Sem despesas
                    </Badge>
                  ) : (
                    <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                      {labelDespesas(item.quantidadeItens)}
                    </span>
                  )}
                </td>
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  {valorLabel === null ? (
                    <span className="text-[length:var(--text-sm)] italic text-[var(--color-text-subtle)]">
                      Sem lançamentos
                    </span>
                  ) : (
                    <span className="font-mono text-[length:var(--text-sm)] font-bold tabular-nums text-[var(--color-text)]">
                      {valorLabel}
                    </span>
                  )}
                </td>
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  <PrestacaoStatusBadge status={item.status} />
                </td>
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  <Button
                    asChild
                    variant="secondary"
                    className="min-h-[36px] whitespace-nowrap px-[var(--space-3)] py-1"
                  >
                    <Link href={prestacaoDetalheHref(item.viagemId)}>
                      Abrir prestação
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
