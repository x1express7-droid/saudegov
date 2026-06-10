'use client'

import type {
  AgendamentoProcessoListItem,
  ProcessoFinanceiroOutput,
  ProcessoTfdDetalheOutput,
  TfdProcessoDadosClinicosOutput,
} from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  formatDateHoraBr,
  formatDateTimeBr,
  ProtocoloBadge,
  type ColumnDef,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { AgendamentoStatusBadge } from '../../../components/agendamento-status-badge'
import { ProcessoStatusBadge } from '../../../components/processo-status-badge'
import { DadosClinicosSection } from '../../../[id]/components/dados-clinicos-section'
import { DocumentosAnexoDownload } from './documentos-anexo-download'
import {
  ProcessoContextoBar,
  type ProcessoDetalheTabId,
} from './processo-contexto-bar'
import { ProcessoFinanceiroSection } from './processo-financeiro-section'
import { ProcessoSolicitacoesLista } from './processo-solicitacoes-lista'
import { ProcessoTimeline } from './processo-timeline'

const TABS: Array<{ id: ProcessoDetalheTabId; label: string }> = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'solicitacoes', label: 'Solicitações' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'historico', label: 'Histórico' },
  { id: 'documentos', label: 'Documentos' },
]

const PROCESSO_ENCERRADOS = new Set(['CONCLUIDO', 'CANCELADO', 'ARQUIVADO'])

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatDateTime(iso: string): string {
  return formatDateTimeBr(iso, iso)
}

function formatDataConsulta(iso: string, hora: string | null): string {
  return formatDateHoraBr(iso, hora)
}

function labelPrestadorAgendamento(item: AgendamentoProcessoListItem): string {
  const { prestador } = item
  if (!prestador.nome) {
    return '—'
  }
  if (prestador.cidade && prestador.estado) {
    return `${prestador.nome} (${prestador.cidade}/${prestador.estado})`
  }
  return prestador.nome
}

function labelTipoAtendimento(tipo: string): string {
  return TIPO_ATENDIMENTO_LABEL[tipo] ?? tipo
}

export interface ProcessoDetalheViewProps {
  session: SaudeMunicSession
  processo: ProcessoTfdDetalheOutput
  agendamentos: AgendamentoProcessoListItem[]
  financeiro: ProcessoFinanceiroOutput | null
  dadosClinicos: TfdProcessoDadosClinicosOutput | null
  podeVerDadosClinicos: boolean
}

export function ProcessoDetalheView({
  session,
  processo,
  agendamentos,
  financeiro,
  dadosClinicos,
  podeVerDadosClinicos,
}: ProcessoDetalheViewProps) {
  const [tab, setTab] = useState<ProcessoDetalheTabId>('visao')

  const processoAberto = !PROCESSO_ENCERRADOS.has(processo.status)
  const processoBase = `/saude/tfd/processos/${processo.id}`

  const valoresPorSolicitacao = useMemo(() => {
    if (!financeiro) {
      return undefined
    }
    return Object.fromEntries(
      financeiro.solicitacoes.map((item) => [item.solicitacaoId, item.valorTotalEstimado])
    )
  }, [financeiro])

  const agendamentosColumns = useMemo<ColumnDef<AgendamentoProcessoListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => <ProtocoloBadge protocolo={row.original.protocolo} />,
      },
      {
        id: 'sequencia',
        header: 'Seq.',
        cell: ({ row }) => (
          <Badge variant="gray" size="sm">
            {row.original.sequencia}
          </Badge>
        ),
      },
      {
        id: 'data',
        header: 'Data',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text)]">
            {formatDataConsulta(row.original.dataConsulta, row.original.horaConsulta)}
          </span>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {labelTipoAtendimento(row.original.tipoAtendimento)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <AgendamentoStatusBadge status={row.original.status} />,
      },
      {
        id: 'prestador',
        header: 'Prestador',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">
            {labelPrestadorAgendamento(row.original)}
          </span>
        ),
      },
      {
        id: 'acao',
        header: '',
        cell: ({ row }) => (
          <Link
            href={`${processoBase}/agendamentos/${row.original.id}`}
            className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
          >
            Ver agendamento
          </Link>
        ),
      },
    ],
    [processoBase]
  )

  return (
    <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
      <ProcessoContextoBar
        processo={processo}
        totalEstimado={financeiro?.totalEstimadoProcesso ?? null}
        onNavigateTab={setTab}
      />

      <div
        className="flex flex-wrap gap-[var(--space-1)] border-b border-[var(--color-border)]"
        role="tablist"
        aria-label="Seções do processo TFD"
      >
        {TABS.map((item) => {
          const selected = tab === item.id
          const financeiroBadge =
            item.id === 'financeiro' &&
            financeiro != null &&
            financeiro.totalEstimadoProcesso > 0
              ? currencyFormatter.format(financeiro.totalEstimadoProcesso)
              : null

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={[
                'inline-flex items-center gap-[var(--space-2)] rounded-t-[var(--radius)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium transition-colors',
                selected
                  ? 'border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {financeiroBadge ? (
                <span className="hidden font-mono text-[length:var(--text-xs)] tabular-nums text-[var(--color-success)] sm:inline">
                  {financeiroBadge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {tab === 'visao' ? (
        <div className="flex flex-col gap-[var(--space-6)]">
          <Card header={<CardHeader>Dados do processo</CardHeader>}>
            <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Protocolo
                </dt>
                <dd className="mt-1">
                  <ProtocoloBadge protocolo={processo.protocolo} />
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Status
                </dt>
                <dd className="mt-1">
                  <ProcessoStatusBadge status={processo.status} />
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Título
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{processo.titulo}</dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Solicitações vinculadas
                </dt>
                <dd className="mt-1">
                  <Badge variant="blue" size="sm">
                    {processo.solicitacoes.length}
                  </Badge>
                </dd>
              </div>
              {financeiro != null && financeiro.totalEstimadoProcesso > 0 ? (
                <div>
                  <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                    Custo estimado
                  </dt>
                  <dd className="mt-1">
                    <button
                      type="button"
                      className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-success)] hover:underline"
                      onClick={() => setTab('financeiro')}
                    >
                      {currencyFormatter.format(financeiro.totalEstimadoProcesso)}
                    </button>
                    <span className="ml-2 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      Ver aba Financeiro
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {podeVerDadosClinicos && dadosClinicos ? (
            <DadosClinicosSection
              session={session}
              processoId={processo.id}
              dadosIniciais={dadosClinicos}
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'solicitacoes' ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          {processoAberto ? (
            <div className="flex justify-end">
              <PermissionGate session={session} permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}>
                <Button variant="primary" asChild>
                  <Link href={`/saude/tfd/nova?processoId=${processo.id}`}>
                    Nova solicitação
                  </Link>
                </Button>
              </PermissionGate>
            </div>
          ) : null}
          <ProcessoSolicitacoesLista
            solicitacoes={processo.solicitacoes}
            valoresPorSolicitacao={valoresPorSolicitacao}
          />
        </div>
      ) : null}

      {tab === 'financeiro' ? (
        financeiro ? (
          <ProcessoFinanceiroSection financeiro={financeiro} />
        ) : (
          <EmptyState
            titulo="Sem dados financeiros"
            descricao="As despesas e reservas de saldo aparecerão aqui quando houver solicitações com custos lançados."
          />
        )
      ) : null}

      {tab === 'agendamentos' ? (
        <DataTable
          data={agendamentos}
          columns={agendamentosColumns}
          pagination={{
            page: 1,
            perPage: Math.max(agendamentos.length, 1),
            total: agendamentos.length,
          }}
          onPaginationChange={() => {}}
          emptyMessage="Nenhum agendamento neste processo"
          emptyDescription="Os agendamentos aparecem aqui após a aprovação e registro de consultas."
        />
      ) : null}

      {tab === 'historico' ? (
        <Card header={<CardHeader>Histórico de tramitações</CardHeader>}>
          {processo.tramitacoes.length > 0 ? (
            <ProcessoTimeline tramitacoes={processo.tramitacoes} />
          ) : (
            <EmptyState
              titulo="Sem tramitações"
              descricao="Ainda não há movimentações registradas neste processo."
            />
          )}
        </Card>
      ) : null}

      {tab === 'documentos' ? (
        <Card header={<CardHeader>Documentos do processo</CardHeader>}>
          {processo.anexos.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {processo.anexos.map((anexo) => (
                <li
                  key={anexo.id}
                  className="flex flex-wrap items-center justify-between gap-[var(--space-3)] py-[var(--space-3)] first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text)]">
                      {anexo.nomeOriginal}
                    </p>
                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      {anexo.mimeType} · {formatDateTime(anexo.createdAt)}
                    </p>
                  </div>
                  <DocumentosAnexoDownload
                    anexoId={anexo.id}
                    nomeOriginal={anexo.nomeOriginal}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              titulo="Sem anexos"
              descricao="Laudos, comprovantes e passagens vinculados ao processo aparecerão aqui."
            />
          )}
        </Card>
      ) : null}
    </div>
  )
}
