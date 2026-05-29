'use client'

import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { TransporteAgendamentoItem, ViagemPorAgendamentoItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ProtocoloBadge,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { ArrowRight, Bus, ChevronDown, Route } from 'lucide-react'
import Link from 'next/link'

import { ViagemStatusBadge } from '../../../../../components/viagem-status-badge'
import {
  currencyFormatter,
  formatDataHora,
  labelTipoSegmento,
  TIPO_SEGMENTO_CONFIG,
  TRANSPORTE_STATUS_CONFIG,
} from './transporte-constants'

export interface DeslocamentoSectionProps {
  session: SaudeMunicSession
  agendamentoId: string
  viagensVinculadas: ViagemPorAgendamentoItem[]
  transportesLegado: TransporteAgendamentoItem[]
}

const TIPO_TRECHO_LABEL: Record<string, string> = {
  IDA: 'Ida',
  VOLTA: 'Volta',
  IDA_VOLTA: 'Ida e volta',
}

function labelTipoTrecho(tipo: string): string {
  return TIPO_TRECHO_LABEL[tipo] ?? tipo
}

function formatDataSaida(iso: string): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  return new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
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

function ViagemVinculadaCard({ viagem }: { viagem: ViagemPorAgendamentoItem }) {
  return (
    <article className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          <Link
            href={`/saude/tfd/viagens/${viagem.id}`}
            className="hover:opacity-90"
          >
            <ProtocoloBadge protocolo={viagem.protocolo} />
          </Link>
          <ViagemStatusBadge status={viagem.status} size="sm" />
        </div>
        <Badge variant="gray" size="sm">
          Trecho: {labelTipoTrecho(viagem.tipoTrecho)}
        </Badge>
      </div>

      <dl className="grid gap-[var(--space-2)] sm:grid-cols-2">
        <div>
          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Data de saída
          </dt>
          <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            {formatDataSaida(viagem.dataSaida)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Rota</dt>
          <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            {viagem.origemDescricao}
            <ArrowRight className="mx-1 inline size-4 align-text-bottom text-[var(--color-text-muted)]" />
            {viagem.destinoDescricao}
          </dd>
        </div>
      </dl>

      <Link
        href={`/saude/tfd/viagens/${viagem.id}`}
        className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
      >
        Ver viagem →
      </Link>
    </article>
  )
}

export function DeslocamentoSection({
  session,
  agendamentoId,
  viagensVinculadas,
  transportesLegado,
}: DeslocamentoSectionProps) {
  const novaViagemHref = `/saude/tfd/viagens/nova?agendamentoId=${encodeURIComponent(agendamentoId)}`

  return (
    <Card header={<CardHeader className="border-0 p-0">Deslocamento</CardHeader>}>
      {viagensVinculadas.length === 0 ? (
        <EmptyState
          icon={<Route className="size-6" aria-hidden="true" />}
          titulo="Nenhum deslocamento vinculado"
          descricao="Crie uma viagem TFD e vincule este agendamento como passageiro para organizar o deslocamento."
          cta={
            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
              <Button asChild variant="primary">
                <Link href={novaViagemHref}>Criar viagem</Link>
              </Button>
            </PermissionGate>
          }
        />
      ) : (
        <ul className="flex flex-col gap-[var(--space-4)]">
          {viagensVinculadas.map((viagem) => (
            <li key={`${viagem.id}-${viagem.tipoTrecho}`}>
              <ViagemVinculadaCard viagem={viagem} />
            </li>
          ))}
        </ul>
      )}

      {transportesLegado.length > 0 ? (
        <details className="mt-[var(--space-6)] group rounded-[var(--radius-md)] border border-[var(--color-border)]">
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
      ) : null}
    </Card>
  )
}
