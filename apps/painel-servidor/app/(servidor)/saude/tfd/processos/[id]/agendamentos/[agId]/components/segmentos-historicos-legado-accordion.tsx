'use client'

import type { TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'
import { Badge } from '@saude/ui'
import { ArrowRight, Bus, ChevronDown } from 'lucide-react'

import {
  currencyFormatter,
  formatDataHora,
  labelTipoSegmento,
  TIPO_SEGMENTO_CONFIG,
  TRANSPORTE_STATUS_CONFIG,
} from './transporte-constants'

export interface SegmentosHistoricosLegadoAccordionProps {
  transportesLegado: TransporteAgendamentoItem[]
}

function TransporteLegadoStatusBadge({ status }: { status: string }) {
  const config = TRANSPORTE_STATUS_CONFIG[status] ?? {
    label: status,
    color: 'gray' as const,
  }
  return (
    <Badge variant={config.color} size="sm">
      {config.label}
    </Badge>
  )
}

function SegmentoLegadoReadonly({ segmento }: { segmento: TransporteAgendamentoItem }) {
  const config = TIPO_SEGMENTO_CONFIG[segmento.tipoSegmento] ?? TIPO_SEGMENTO_CONFIG.OUTRO!

  return (
    <article className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)]">
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
          Segmento {segmento.sequencia}
        </span>
        <Badge variant="gray" size="sm" className="gap-1">
          <span aria-hidden="true">{config.emoji}</span>
          {labelTipoSegmento(segmento.tipoSegmento)}
        </Badge>
        <TransporteLegadoStatusBadge status={segmento.status} />
        <Badge variant="slate" size="sm">
          Histórico
        </Badge>
      </div>

      <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
        <span className="font-medium">{segmento.origemDescricao}</span>
        <ArrowRight className="mx-1 inline size-4 align-text-bottom text-[var(--color-text-muted)]" />
        <span className="font-medium">{segmento.destinoDescricao}</span>
      </p>

      <dl className="grid gap-[var(--space-2)] sm:grid-cols-2">
        <div>
          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Saída</dt>
          <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            {formatDataHora(segmento.dataSaida, segmento.horaSaida)}
          </dd>
        </div>
        {segmento.custoEstimado !== null ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Custo estimado
            </dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {currencyFormatter.format(segmento.custoEstimado)}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  )
}

export function SegmentosHistoricosLegadoAccordion({
  transportesLegado,
}: SegmentosHistoricosLegadoAccordionProps) {
  if (transportesLegado.length === 0) {
    return null
  }

  // BLOCO-1: accordion legado colapsado por padrão, após a seção Deslocamento na página
  return (
    <details className="group rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-[var(--space-2)]">
          <Bus className="size-4 text-[var(--color-text-muted)]" aria-hidden="true" />
          Segmentos históricos (legado)
          <Badge variant="gray" size="sm">
            {transportesLegado.length}
          </Badge>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-4)]">
        <p className="mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Registros do modelo anterior — somente visualização.
        </p>
        <ul className="flex flex-col gap-[var(--space-4)]">
          {transportesLegado.map((segmento) => (
            <li key={segmento.id}>
              <SegmentoLegadoReadonly segmento={segmento} />
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
