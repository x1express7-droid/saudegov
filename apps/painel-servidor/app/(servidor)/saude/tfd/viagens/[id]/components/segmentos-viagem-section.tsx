'use client'

import type { SegmentoViagemItem, TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Badge, Button, Card, CardHeader, EmptyState } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { ArrowRight, MapPin, Plus, Route } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { CancelarTransporteDialog } from '../../../processos/[id]/agendamentos/[agId]/components/cancelar-transporte-dialog'
import { ConfirmarTransporteDialog } from '../../../processos/[id]/agendamentos/[agId]/components/confirmar-transporte-dialog'
import { RegistrarChegadaDialog } from '../../../processos/[id]/agendamentos/[agId]/components/registrar-chegada-dialog'
import {
  currencyFormatter,
  formatDataHora,
  labelTipoSegmento,
  TIPO_SEGMENTO_CONFIG,
  TRANSPORTE_STATUS_CONFIG,
} from '../../../processos/[id]/agendamentos/[agId]/components/transporte-constants'

export interface SegmentosViagemSectionProps {
  session: SaudeMunicSession
  viagemId: string
  viagemProtocolo: string
  viagemStatus: string
  segmentos: SegmentoViagemItem[]
}

function TransporteStatusBadge({ status }: { status: string }) {
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

function toTransporteDialogItem(segmento: SegmentoViagemItem): TransporteAgendamentoItem {
  return {
    id: segmento.id,
    sequencia: segmento.sequencia,
    tipoSegmento: segmento.tipoSegmento,
    status: segmento.status,
    origemDescricao: segmento.origemDescricao,
    destinoDescricao: segmento.destinoDescricao,
    dataSaida: segmento.dataSaida,
    horaSaida: segmento.horaSaida,
    dataChegada: segmento.dataChegada,
    horaChegada: segmento.horaChegada,
    custoEstimado: segmento.custoEstimado,
    custoReal: segmento.custoReal,
    responsavelPagamento: 'MUNICIPIO',
    observacoes: segmento.observacoes,
    veiculo: segmento.veiculo
      ? { id: '', placa: segmento.veiculo.placa, modelo: segmento.veiculo.modelo }
      : null,
    motorista: segmento.motorista ? { id: '', nome: segmento.motorista.nome } : null,
    kmSaida: segmento.kmSaida,
    kmChegada: segmento.kmChegada,
    anexos: [],
  }
}

function RotaTimeline({ segmentos }: { segmentos: SegmentoViagemItem[] }) {
  const pontos: string[] = []
  for (const segmento of segmentos) {
    if (pontos.length === 0) {
      pontos.push(segmento.origemDescricao)
    }
    pontos.push(segmento.destinoDescricao)
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-[var(--space-4)]">
      <p className="mb-[var(--space-3)] flex items-center gap-[var(--space-2)] text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        <Route className="size-4" aria-hidden="true" />
        Rota completa
      </p>
      <ol className="flex flex-wrap items-center gap-y-[var(--space-2)]">
        {pontos.map((ponto, index) => (
          <li key={`${ponto}-${index}`} className="flex items-center">
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-[var(--space-2)] py-1 text-[length:var(--text-sm)] text-[var(--color-text)]">
              <MapPin className="size-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              {ponto}
            </span>
            {index < pontos.length - 1 ? (
              <ArrowRight
                className="mx-[var(--space-2)] size-4 shrink-0 text-[var(--color-text-muted)]"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function SegmentoCard({
  segmento,
  onConfirmar,
  onChegada,
  onCancelar,
}: {
  segmento: SegmentoViagemItem
  onConfirmar: () => void
  onChegada: () => void
  onCancelar: () => void
}) {
  const config = TIPO_SEGMENTO_CONFIG[segmento.tipoSegmento] ?? TIPO_SEGMENTO_CONFIG.OUTRO!
  const podeConfirmar = segmento.status === 'PENDENTE'
  const podeChegada =
    segmento.status === 'CONFIRMADO' || segmento.status === 'EM_TRANSITO'
  const podeCancelar = segmento.status === 'PENDENTE' || segmento.status === 'CONFIRMADO'

  return (
    <article className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]">
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
          Segmento {segmento.sequencia}
        </span>
        <Badge variant="gray" size="sm" className="gap-1">
          <span aria-hidden="true">{config.emoji}</span>
          {labelTipoSegmento(segmento.tipoSegmento)}
        </Badge>
        <TransporteStatusBadge status={segmento.status} />
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
        {segmento.dataChegada ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Chegada</dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {formatDataHora(segmento.dataChegada, segmento.horaChegada)}
            </dd>
          </div>
        ) : null}
        {segmento.veiculo ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Veículo</dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {segmento.veiculo.placa} — {segmento.veiculo.modelo}
            </dd>
          </div>
        ) : null}
        {segmento.motorista ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Motorista
            </dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {segmento.motorista.nome}
            </dd>
          </div>
        ) : null}
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

      {segmento.observacoes ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          {segmento.observacoes}
        </p>
      ) : null}

      {podeConfirmar || podeChegada || podeCancelar ? (
        <div className="flex flex-wrap gap-[var(--space-2)] border-t border-[var(--color-border)] pt-[var(--space-3)]">
          {podeConfirmar ? (
            <Button type="button" variant="secondary" onClick={onConfirmar}>
              Confirmar
            </Button>
          ) : null}
          {podeChegada ? (
            <Button type="button" variant="secondary" onClick={onChegada}>
              Registrar chegada
            </Button>
          ) : null}
          {podeCancelar ? (
            <Button type="button" variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export function SegmentosViagemSection({
  session,
  viagemId,
  viagemProtocolo,
  viagemStatus,
  segmentos,
}: SegmentosViagemSectionProps) {
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<SegmentoViagemItem | null>(null)
  const [confirmarOpen, setConfirmarOpen] = useState(false)
  const [chegadaOpen, setChegadaOpen] = useState(false)
  const [cancelarOpen, setCancelarOpen] = useState(false)

  const podeAdicionar =
    viagemStatus === 'PLANEJADA' ||
    viagemStatus === 'CONFIRMADA' ||
    viagemStatus === 'EM_ANDAMENTO'

  const novoSegmentoHref = `/saude/tfd/viagens/${viagemId}/segmento/novo`

  function abrirConfirmar(segmento: SegmentoViagemItem) {
    setSegmentoSelecionado(segmento)
    setConfirmarOpen(true)
  }

  function abrirChegada(segmento: SegmentoViagemItem) {
    setSegmentoSelecionado(segmento)
    setChegadaOpen(true)
  }

  function abrirCancelar(segmento: SegmentoViagemItem) {
    setSegmentoSelecionado(segmento)
    setCancelarOpen(true)
  }

  const transporteDialog =
    segmentoSelecionado !== null ? toTransporteDialogItem(segmentoSelecionado) : null

  return (
    <Card header={<CardHeader>Segmentos de Deslocamento</CardHeader>}>
      <div className="flex flex-col gap-[var(--space-4)]">
        {podeAdicionar ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={novoSegmentoHref}>
                <Plus className="mr-[var(--space-2)] size-4" aria-hidden="true" />
                {/* BLOCO-3: rótulo do botão de novo trecho */}
                + Adicionar trecho de deslocamento
              </Link>
            </Button>
          </PermissionGate>
        ) : null}

        {segmentos.length === 0 ? (
          // BLOCO-3: estado vazio com orientação para viagem municipal
          <EmptyState
            icon={<Route className="size-6" aria-hidden="true" />}
            titulo="Nenhum segmento cadastrado"
            descricao="Para a maioria das viagens com van municipal, adicione um único trecho de Campo Grande até o destino."
            cta={
              podeAdicionar ? (
                <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
                  <Button asChild variant="primary">
                    <Link href={novoSegmentoHref}>+ Adicionar trecho de deslocamento</Link>
                  </Button>
                </PermissionGate>
              ) : undefined
            }
          />
        ) : (
          <>
            {segmentos.length >= 2 ? <RotaTimeline segmentos={segmentos} /> : null}
            <ul className="flex flex-col gap-[var(--space-4)]">
              {segmentos.map((segmento) => (
                <li key={segmento.id}>
                  <SegmentoCard
                    segmento={segmento}
                    onConfirmar={() => abrirConfirmar(segmento)}
                    onChegada={() => abrirChegada(segmento)}
                    onCancelar={() => abrirCancelar(segmento)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ConfirmarTransporteDialog
        open={confirmarOpen}
        onOpenChange={setConfirmarOpen}
        transporte={transporteDialog}
      />
      <RegistrarChegadaDialog
        open={chegadaOpen}
        onOpenChange={setChegadaOpen}
        transporte={transporteDialog}
      />
      <CancelarTransporteDialog
        open={cancelarOpen}
        onOpenChange={setCancelarOpen}
        transporte={transporteDialog}
      />

      <span className="sr-only">Viagem {viagemProtocolo}</span>
    </Card>
  )
}
