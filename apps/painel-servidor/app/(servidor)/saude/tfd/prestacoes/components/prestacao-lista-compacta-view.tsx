'use client'

import type { TfdPrestacaoListItem } from '@saude/mod-saude-tfd/client'
import { Badge, Button, Card } from '@saude/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { PrestacaoStatusBadge } from './prestacao-status-badge'
import {
  formatDataPrazo,
  getPrazoDestaque,
  labelDespesas,
  labelValorTotal,
  prestacaoDetalheHref,
  prazoDestaqueClassName,
  prazoTextClassName,
  protocoloPc,
} from './prestacao-utils'

// BLOCO-14-PRESTACOES
export interface PrestacaoListaCompactaViewProps {
  items: TfdPrestacaoListItem[]
}

export function PrestacaoListaCompactaView({ items }: PrestacaoListaCompactaViewProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {items.map((item) => {
        const destaque = getPrazoDestaque(item)
        const valorLabel = labelValorTotal(item)
        const detalheHref = prestacaoDetalheHref(item.viagemId)

        return (
          <Card
            key={item.id}
            bodyClassName={`py-[var(--space-3)] px-[var(--space-4)] ${prazoDestaqueClassName(destaque)}`}
          >
            <div className="flex items-center gap-[var(--space-3)]">
              <div className="w-48 shrink-0">
                <p className="truncate font-mono text-[length:var(--text-xs)] font-bold whitespace-nowrap text-[var(--color-text)]">
                  {protocoloPc(item)}
                </p>
                <p className="mt-1 truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {item.paciente.nome}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={detalheHref}
                  className="font-mono text-[length:var(--text-xs)] text-[var(--color-primary)] hover:underline"
                >
                  {item.viagemProtocolo}
                </Link>
                <p className={`mt-1 text-[length:var(--text-xs)] ${prazoTextClassName(item)}`}>
                  Prazo: {formatDataPrazo(item.prazoEnvioAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-[var(--space-2)]">
                {item.quantidadeItens === 0 ? (
                  <Badge variant="red" size="sm">
                    Sem despesas
                  </Badge>
                ) : (
                  <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {labelDespesas(item.quantidadeItens)}
                  </span>
                )}
                {valorLabel === null ? (
                  <span className="text-[length:var(--text-xs)] italic text-[var(--color-text-subtle)]">
                    Sem lançamentos
                  </span>
                ) : (
                  <span className="font-mono text-[length:var(--text-xs)] font-bold tabular-nums text-[var(--color-text)]">
                    {valorLabel}
                  </span>
                )}
                <PrestacaoStatusBadge status={item.status} size="sm" />
              </div>

              <div className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                  onClick={() => router.push(detalheHref)}
                >
                  Abrir
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
