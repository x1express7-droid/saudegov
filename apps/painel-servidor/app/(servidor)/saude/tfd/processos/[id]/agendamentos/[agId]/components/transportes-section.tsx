'use client'

import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  cn,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { ArrowRight, Bus, Paperclip, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { AdicionarAnexoTransporteDialog } from './adicionar-anexo-transporte-dialog'
import { CancelarTransporteDialog } from './cancelar-transporte-dialog'
import { ConfirmarTransporteDialog } from './confirmar-transporte-dialog'
import { RegistrarChegadaDialog } from './registrar-chegada-dialog'
import {
  currencyFormatter,
  formatDataHora,
  TIPO_SEGMENTO_CONFIG,
  TRANSPORTE_STATUS_CONFIG,
} from './transporte-constants'

export interface TransportesSectionProps {
  session: SaudeMunicSession
  processoId: string
  agendamentoId: string
  transportes: TransporteAgendamentoItem[]
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

function TipoSegmentoBadge({ tipo }: { tipo: string }) {
  const config = TIPO_SEGMENTO_CONFIG[tipo] ?? TIPO_SEGMENTO_CONFIG.OUTRO!
  const Icon = config.icon
  return (
    <Badge variant="gray" size="sm" className="gap-1">
      <Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </Badge>
  )
}

function RotaTimeline({ transportes }: { transportes: TransporteAgendamentoItem[] }) {
  const ativos = transportes.filter((t) => t.status !== 'CANCELADO')
  if (ativos.length === 0) {
    return null
  }

  return (
    <div
      className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)]"
      aria-label="Rota completa do agendamento"
    >
      <p className="mb-[var(--space-3)] text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        Rota completa
      </p>
      <ol className="flex flex-wrap items-center gap-[var(--space-2)]">
        {ativos.map((segmento, index) => {
          const config =
            TIPO_SEGMENTO_CONFIG[segmento.tipoSegmento] ?? TIPO_SEGMENTO_CONFIG.OUTRO!
          return (
            <li key={segmento.id} className="flex items-center gap-[var(--space-2)]">
              {index > 0 ? (
                <ArrowRight
                  className="size-4 shrink-0 text-[var(--color-text-muted)]"
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text)]',
                  segmento.status === 'CONCLUIDO' && 'border-[var(--color-success)]',
                  segmento.status === 'EM_TRANSITO' && 'border-[var(--color-primary)]'
                )}
              >
                <span aria-hidden="true">{config.emoji}</span>
                <span className="max-w-[8rem] truncate" title={segmento.destinoDescricao}>
                  {segmento.destinoDescricao}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function SegmentoCard({
  session,
  segmento,
  onConfirmar,
  onChegada,
  onCancelar,
  onAnexo,
}: {
  session: SaudeMunicSession
  segmento: TransporteAgendamentoItem
  onConfirmar: () => void
  onChegada: () => void
  onCancelar: () => void
  onAnexo: () => void
}) {
  const podeConfirmar = segmento.status === 'PENDENTE'
  const podeChegada =
    segmento.status === 'CONFIRMADO' || segmento.status === 'EM_TRANSITO'
  const podeCancelar = segmento.status === 'PENDENTE' || segmento.status === 'CONFIRMADO'
  const podeAnexo = segmento.status !== 'CANCELADO'

  return (
    <article
      className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-[var(--space-2)]">
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
            Segmento {segmento.sequencia}
          </span>
          <TipoSegmentoBadge tipo={segmento.tipoSegmento} />
          <TransporteStatusBadge status={segmento.status} />
        </div>
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
        <div>
          <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Chegada</dt>
          <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            {formatDataHora(segmento.dataChegada, segmento.horaChegada)}
          </dd>
        </div>
        {segmento.tipoSegmento === 'TERRESTRE_PROPRIO' && segmento.veiculo ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Veículo</dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {segmento.veiculo.placa} — {segmento.veiculo.modelo}
            </dd>
          </div>
        ) : null}
        {segmento.tipoSegmento === 'TERRESTRE_PROPRIO' && segmento.motorista ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Motorista</dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {segmento.motorista.nome}
            </dd>
          </div>
        ) : null}
        {segmento.kmSaida !== null ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Km saída</dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {segmento.kmSaida}
            </dd>
          </div>
        ) : null}
        {segmento.kmChegada !== null ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Km chegada</dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {segmento.kmChegada}
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
        {segmento.custoReal !== null ? (
          <div>
            <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Custo real</dt>
            <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {currencyFormatter.format(segmento.custoReal)}
            </dd>
          </div>
        ) : null}
      </dl>

      {segmento.anexos.length > 0 ? (
        <div>
          <p className="mb-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Anexos ({segmento.anexos.length})
          </p>
          <ul className="flex flex-wrap gap-[var(--space-2)]">
            {segmento.anexos.map((anexo) => (
              <li key={anexo.id}>
                <Badge variant="gray" size="sm">
                  {anexo.tipoAnexo}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {segmento.observacoes ? (
        <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] whitespace-pre-wrap">
          {segmento.observacoes}
        </p>
      ) : null}

      <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_TRANSPORTE}>
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
          {podeAnexo ? (
            <Button type="button" variant="ghost" onClick={onAnexo}>
              <Paperclip className="mr-1 size-3.5" aria-hidden="true" />
              Anexo
            </Button>
          ) : null}
        </div>
      </PermissionGate>
    </article>
  )
}

export function TransportesSection({
  session,
  processoId,
  agendamentoId,
  transportes,
}: TransportesSectionProps) {
  const [dialogTransporte, setDialogTransporte] = useState<TransporteAgendamentoItem | null>(
    null
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [chegadaOpen, setChegadaOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [anexoOpen, setAnexoOpen] = useState(false)

  const novoHref = `/saude/tfd/processos/${processoId}/agendamentos/${agendamentoId}/transporte/novo`

  return (
    <>
      <Card
        header={
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
            <CardHeader className="border-0 p-0">Transportes</CardHeader>
            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_TRANSPORTE}>
              <Button asChild variant="secondary">
                <Link href={novoHref}>
                  <Plus className="mr-1 size-4" aria-hidden="true" />
                  Adicionar segmento
                </Link>
              </Button>
            </PermissionGate>
          </div>
        }
      >
        {transportes.length === 0 ? (
          <EmptyState
            icon={<Bus className="size-6" aria-hidden="true" />}
            titulo="Nenhum segmento de transporte cadastrado"
            descricao="Cadastre os deslocamentos necessários para este agendamento (ex.: carro até o aeroporto e voo até o destino)."
            cta={
              <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_TRANSPORTE}>
                <Button asChild variant="primary">
                  <Link href={novoHref}>Adicionar segmento de transporte</Link>
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          <div className="flex flex-col gap-[var(--space-6)]">
            <RotaTimeline transportes={transportes} />

            <ul className="flex flex-col gap-[var(--space-4)]">
              {transportes.map((segmento) => (
                <li key={segmento.id}>
                  <SegmentoCard
                    session={session}
                    segmento={segmento}
                    onConfirmar={() => {
                      setDialogTransporte(segmento)
                      setConfirmOpen(true)
                    }}
                    onChegada={() => {
                      setDialogTransporte(segmento)
                      setChegadaOpen(true)
                    }}
                    onCancelar={() => {
                      setDialogTransporte(segmento)
                      setCancelOpen(true)
                    }}
                    onAnexo={() => {
                      setDialogTransporte(segmento)
                      setAnexoOpen(true)
                    }}
                  />
                </li>
              ))}
            </ul>

            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_TRANSPORTE}>
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link href={novoHref}>
                  <Plus className="mr-1 size-4" aria-hidden="true" />
                  Adicionar segmento de transporte
                </Link>
              </Button>
            </PermissionGate>
          </div>
        )}
      </Card>

      <ConfirmarTransporteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        transporte={dialogTransporte}
      />
      <RegistrarChegadaDialog
        open={chegadaOpen}
        onOpenChange={setChegadaOpen}
        transporte={dialogTransporte}
      />
      <CancelarTransporteDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        transporte={dialogTransporte}
      />
      <AdicionarAnexoTransporteDialog
        open={anexoOpen}
        onOpenChange={setAnexoOpen}
        processoId={processoId}
        transporte={dialogTransporte}
      />
    </>
  )
}
