'use client'

import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'
import { Button, Card } from '@saude/ui'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { ViagemStatusBadge } from '../../components/viagem-status-badge'
import {
  formatDataSaidaCurta,
  labelRota,
  labelVeiculoAbreviado,
  motoristaNaoAlocado,
  viagemDetalheHref,
} from './viagem-lista-utils'
import { getViagemTemporalBadge } from './viagem-temporal-badge'

// BLOCO-10-VIAGENS
function labelVeiculoMotorista(item: ViagemTfdListItem): string {
  const veiculo = labelVeiculoAbreviado(item.veiculo)
  const motorista = item.motorista?.nome

  if (veiculo && motorista) {
    return `${veiculo} · ${motorista}`
  }
  if (veiculo) {
    return veiculo
  }
  if (motorista) {
    return motorista
  }
  if (motoristaNaoAlocado(item.status, item.motorista)) {
    return 'Motorista não alocado'
  }
  return '—'
}

function veiculoMotoristaClassName(item: ViagemTfdListItem): string {
  if (motoristaNaoAlocado(item.status, item.motorista)) {
    return 'text-[var(--color-warning)]'
  }
  return 'text-[var(--color-text-muted)]'
}

export interface ViagemListaCompactaViewProps {
  items: ViagemTfdListItem[]
}

export function ViagemListaCompactaView({ items }: ViagemListaCompactaViewProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {items.map((item) => {
        const detalheHref = viagemDetalheHref(item.id)
        const temporalBadge = getViagemTemporalBadge(item.dataSaida, item.status)
        const vagasLabel =
          item.capacidadeVeiculo !== null
            ? `${item.totalPassageiros}/${item.capacidadeVeiculo} vagas`
            : item.totalPassageiros > 0
              ? String(item.totalPassageiros)
              : null

        return (
          <Card key={item.id} bodyClassName="py-[var(--space-3)] px-[var(--space-4)]">
            <div className="flex items-center gap-[var(--space-3)]">
              <div className="w-32 shrink-0 md:w-48">
                <p className="truncate font-mono text-[length:var(--text-xs)] font-bold whitespace-nowrap text-[var(--color-text)]">
                  {item.protocolo}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-[var(--space-1)]">
                  <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {formatDataSaidaCurta(item.dataSaida)}
                  </span>
                  {temporalBadge}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {labelRota(item)}
                </p>
                <p
                  className={`mt-0.5 truncate text-[length:var(--text-xs)] ${veiculoMotoristaClassName(item)}`}
                >
                  {labelVeiculoMotorista(item)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-[var(--space-2)]">
                {vagasLabel ? (
                  <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {vagasLabel}
                  </span>
                ) : null}
                <ViagemStatusBadge status={item.status} size="sm" />
              </div>

              <div className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                  onClick={() => router.push(detalheHref)}
                >
                  Ver
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
