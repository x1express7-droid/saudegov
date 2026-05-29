'use client'

import {
  formatCnhCategorias,
  type MotoristaDetalheOutput,
} from '@saude/mod-saude-tfd/client'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  type ColumnDef,
} from '@saude/ui'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { ViagemStatusBadge } from '../../../../components/viagem-status-badge'

const TABS = [
  { id: 'dados', label: 'Dados' },
  { id: 'historico', label: 'Histórico de Viagens' },
] as const

type TabId = (typeof TABS)[number]['id']

const MOTORISTAS_CONFIG_PATH = '/saude/tfd/configuracoes/motoristas'
const VIAGENS_BASE = '/saude/tfd/viagens'

function formatData(iso: string): string {
  return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function DetalheCampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
        {label}
      </dt>
      <dd className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">{children}</dd>
    </div>
  )
}

function cnhStatusBadge(motorista: MotoristaDetalheOutput) {
  if (motorista.cnhVencida) {
    return (
      <Badge variant="red" className="inline-flex items-center gap-[var(--space-1)]">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        VENCIDA
      </Badge>
    )
  }
  if (motorista.cnhVencendoEmBreve) {
    return (
      <Badge variant="yellow" className="inline-flex items-center gap-[var(--space-1)]">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        VENCENDO
      </Badge>
    )
  }
  return <Badge variant="green">VÁLIDA</Badge>
}

export interface MotoristaDetalheViewProps {
  motorista: MotoristaDetalheOutput
}

export function MotoristaDetalheView({ motorista }: MotoristaDetalheViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<TabId>('dados')

  const historicoPage = Math.max(
    1,
    Number.parseInt(searchParams.get('page') ?? String(motorista.historico.page), 10) || 1
  )

  const handleHistoricoPagination = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (nextPage <= 1) {
        params.delete('page')
      } else {
        params.set('page', String(nextPage))
      }
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const historicoColumns = useMemo<
    ColumnDef<MotoristaDetalheOutput['historico']['items'][number]>[]
  >(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <Link
            href={`${VIAGENS_BASE}/${row.original.id}`}
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            {row.original.protocolo}
          </Link>
        ),
      },
      {
        id: 'dataSaida',
        header: 'Data saída',
        cell: ({ row }) => formatData(row.original.dataSaida),
      },
      {
        id: 'trajeto',
        header: 'Origem → Destino',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">
            {row.original.origemDescricao} → {row.original.destinoDescricao}
          </span>
        ),
      },
      {
        id: 'veiculo',
        header: 'Veículo',
        cell: ({ row }) =>
          row.original.veiculo
            ? `${row.original.veiculo.placa} · ${row.original.veiculo.modelo}`
            : '—',
      },
      {
        id: 'passageiros',
        header: 'Passageiros',
        cell: ({ row }) => row.original.totalPassageiros,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <ViagemStatusBadge status={row.original.status} />,
      },
    ],
    []
  )

  const exibirAlertaCnh = motorista.cnhVencida || motorista.cnhVencendoEmBreve

  return (
    <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
        <div
          className="flex flex-wrap gap-[var(--space-1)] border-b border-[var(--color-border)]"
          role="tablist"
          aria-label="Seções do motorista"
        >
          {TABS.map((item) => {
            const selected = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={[
                  'rounded-t-[var(--radius)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium transition-colors',
                  selected
                    ? 'border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                ].join(' ')}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {tab === 'dados' ? (
          <Card header={<CardHeader>Dados do motorista</CardHeader>}>
            <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
              <DetalheCampo label="Nome">{motorista.nome}</DetalheCampo>
              <DetalheCampo label="CNS">{motorista.cns ?? '—'}</DetalheCampo>
              <DetalheCampo label="CNH">
                <span className="font-mono">{motorista.cnh}</span>
              </DetalheCampo>
              <DetalheCampo label="Categoria">
                {formatCnhCategorias(motorista.cnhCategoria)}
              </DetalheCampo>
              <DetalheCampo label="Validade da CNH">
                <span className="inline-flex flex-wrap items-center gap-[var(--space-2)]">
                  {formatData(motorista.cnhValidade)}
                  {cnhStatusBadge(motorista)}
                </span>
              </DetalheCampo>
              <DetalheCampo label="Status">
                <Badge variant={motorista.ativo ? 'green' : 'gray'}>
                  {motorista.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </DetalheCampo>
            </dl>
          </Card>
        ) : null}

        {tab === 'historico' ? (
          motorista.historico.total === 0 ? (
            <EmptyState
              titulo="Nenhuma viagem registrada"
              descricao="Este motorista ainda não conduziu viagens TFD."
            />
          ) : (
            <DataTable
              data={motorista.historico.items}
              columns={historicoColumns}
              pagination={{
                page: historicoPage,
                perPage: motorista.historico.perPage,
                total: motorista.historico.total,
              }}
              onPaginationChange={handleHistoricoPagination}
              emptyMessage="Nenhuma viagem encontrada."
            />
          )
        ) : null}
      </div>

      <aside className="flex flex-col gap-[var(--space-4)]">
        {exibirAlertaCnh ? (
          <Alert
            variant={motorista.cnhVencida ? 'error' : 'warning'}
            titulo={motorista.cnhVencida ? 'CNH vencida' : 'CNH vencendo em breve'}
          >
            {motorista.cnhVencida ? (
              <p>
                A CNH deste motorista está vencida desde {formatData(motorista.cnhValidade)}.
                Motoristas com CNH vencida não aparecem na seleção de agendamentos.
              </p>
            ) : (
              <p>
                A CNH vence em {formatData(motorista.cnhValidade)} (menos de 30 dias). Providencie
                a renovação para evitar bloqueio na alocação.
              </p>
            )}
          </Alert>
        ) : null}

        <Card header={<CardHeader>Indicadores</CardHeader>}>
          <dl className="flex flex-col gap-[var(--space-4)]">
            <DetalheCampo label="Total de viagens">{motorista.kpis.totalViagens}</DetalheCampo>
            <DetalheCampo label="KM total rodado">
              {motorista.kpis.kmTotal.toLocaleString('pt-BR')} km
            </DetalheCampo>
            <DetalheCampo label="Viagens no mês">{motorista.kpis.totalViagensNoMes}</DetalheCampo>
          </dl>
        </Card>

        <Button variant="outline" className="w-full" asChild>
          <Link href={MOTORISTAS_CONFIG_PATH}>Editar motorista</Link>
        </Button>
      </aside>
    </div>
  )
}
