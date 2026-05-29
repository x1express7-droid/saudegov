'use client'

import type { VeiculoDetalheOutput } from '@saude/mod-saude-tfd/client'
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, type ColumnDef } from '@saude/ui'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { ViagemStatusBadge } from '../../../../components/viagem-status-badge'

const TABS = [
  { id: 'dados', label: 'Dados' },
  { id: 'historico', label: 'Histórico de Viagens' },
] as const

type TabId = (typeof TABS)[number]['id']

const VEICULOS_CONFIG_PATH = '/saude/tfd/configuracoes/veiculos'
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

export interface VeiculoDetalheViewProps {
  veiculo: VeiculoDetalheOutput
}

export function VeiculoDetalheView({ veiculo }: VeiculoDetalheViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<TabId>('dados')

  const historicoPage = Math.max(
    1,
    Number.parseInt(searchParams.get('page') ?? String(veiculo.historico.page), 10) || 1
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

  const historicoColumns = useMemo<ColumnDef<VeiculoDetalheOutput['historico']['items'][number]>[]>(
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
        id: 'motorista',
        header: 'Motorista',
        cell: ({ row }) => row.original.motoristaNome ?? '—',
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

  return (
    <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
        <div
          className="flex flex-wrap gap-[var(--space-1)] border-b border-[var(--color-border)]"
          role="tablist"
          aria-label="Seções do veículo"
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
          <div className="flex flex-col gap-[var(--space-6)]">
            <Card header={<CardHeader>Identificação</CardHeader>}>
              <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
                <DetalheCampo label="Placa">
                  <span className="font-mono font-medium uppercase">{veiculo.placa}</span>
                </DetalheCampo>
                <DetalheCampo label="Modelo">{veiculo.modelo}</DetalheCampo>
                <DetalheCampo label="Fabricante">{veiculo.fabricante ?? '—'}</DetalheCampo>
                <DetalheCampo label="Ano">{veiculo.ano ?? '—'}</DetalheCampo>
                <DetalheCampo label="Cor">{veiculo.cor ?? '—'}</DetalheCampo>
              </dl>
            </Card>

            <Card header={<CardHeader>Capacidade e status</CardHeader>}>
              <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
                <DetalheCampo label="Capacidade">
                  {veiculo.capacidadePassageiros}{' '}
                  {veiculo.capacidadePassageiros === 1 ? 'passageiro' : 'passageiros'}
                </DetalheCampo>
                <DetalheCampo label="Status">
                  <Badge variant={veiculo.ativo ? 'green' : 'gray'}>
                    {veiculo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </DetalheCampo>
                <DetalheCampo label="Cadastrado em">{formatData(veiculo.createdAt.slice(0, 10))}</DetalheCampo>
              </dl>
            </Card>

            <Card header={<CardHeader>Documentação</CardHeader>}>
              <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
                <DetalheCampo label="RENAVAM">{veiculo.renavam ?? '—'}</DetalheCampo>
                <DetalheCampo label="Chassi">
                  {veiculo.chassi ? (
                    <span className="font-mono text-[length:var(--text-sm)]">{veiculo.chassi}</span>
                  ) : (
                    '—'
                  )}
                </DetalheCampo>
              </dl>
            </Card>
          </div>
        ) : null}

        {tab === 'historico' ? (
          veiculo.historico.total === 0 ? (
            <EmptyState
              titulo="Nenhuma viagem registrada"
              descricao="Este veículo ainda não foi utilizado em viagens TFD."
            />
          ) : (
            <DataTable
              data={veiculo.historico.items}
              columns={historicoColumns}
              pagination={{
                page: historicoPage,
                perPage: veiculo.historico.perPage,
                total: veiculo.historico.total,
              }}
              onPaginationChange={handleHistoricoPagination}
              emptyMessage="Nenhuma viagem encontrada."
            />
          )
        ) : null}
      </div>

      <aside className="flex flex-col gap-[var(--space-4)]">
        <Card header={<CardHeader>Indicadores</CardHeader>}>
          <dl className="flex flex-col gap-[var(--space-4)]">
            <DetalheCampo label="Total de viagens">{veiculo.kpis.totalViagens}</DetalheCampo>
            <DetalheCampo label="KM total rodado">
              {veiculo.kpis.kmTotal.toLocaleString('pt-BR')} km
            </DetalheCampo>
            <DetalheCampo label="Ocupação média">
              {veiculo.kpis.ocupacaoMedia.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
              })}{' '}
              passageiros/viagem
            </DetalheCampo>
          </dl>
        </Card>

        <Button variant="outline" className="w-full" asChild>
          <Link href={VEICULOS_CONFIG_PATH}>Editar veículo</Link>
        </Button>
      </aside>
    </div>
  )
}
