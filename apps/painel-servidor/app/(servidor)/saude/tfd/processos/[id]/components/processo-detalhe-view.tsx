'use client'

import type {
  AgendamentoProcessoListItem,
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
  ProtocoloBadge,
  StatusBadge,
  UrgenciaBadge,
  type ColumnDef,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { AgendamentoStatusBadge } from '../../../components/agendamento-status-badge'
import { ProcessoStatusBadge } from '../../../components/processo-status-badge'
import { DadosClinicosSection } from '../../../[id]/components/dados-clinicos-section'
import { DocumentosAnexoDownload } from './documentos-anexo-download'
import { ProcessoTimeline } from './processo-timeline'

const TABS = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'solicitacoes', label: 'Solicitações' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'historico', label: 'Histórico' },
  { id: 'documentos', label: 'Documentos' },
] as const

type TabId = (typeof TABS)[number]['id']

const PROCESSO_ENCERRADOS = new Set(['CONCLUIDO', 'CANCELADO', 'ARQUIVADO'])

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function isTfdStatus(value: string): value is TfdStatus {
  const statuses: Record<string, true> = {
    RASCUNHO: true,
    ENVIADO: true,
    EM_ANALISE: true,
    PENDENTE: true,
    APROVADO: true,
    NEGADO: true,
    AGENDADO: true,
    EM_VIAGEM: true,
    AGUARDANDO_PC: true,
    PC_EM_ANALISE: true,
    CONCLUIDO: true,
    CANCELADO: true,
  }
  return value in statuses
}

function isTfdUrgencia(value: string): value is TfdUrgencia {
  return value in { BAIXA: true, INTERMEDIARIA: true, GRAVE: true, MUITO_URGENTE: true }
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  try {
    return dateFormatter.format(new Date(iso))
  } catch {
    return '—'
  }
}

function formatDateTime(iso: string): string {
  try {
    return dateTimeFormatter.format(new Date(iso))
  } catch {
    return iso
  }
}

function formatDataConsulta(iso: string, hora: string | null): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  const data = new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return hora ? `${data} às ${hora}` : data
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
  dadosClinicos: TfdProcessoDadosClinicosOutput | null
  podeVerDadosClinicos: boolean
}

export function ProcessoDetalheView({
  session,
  processo,
  agendamentos,
  dadosClinicos,
  podeVerDadosClinicos,
}: ProcessoDetalheViewProps) {
  const [tab, setTab] = useState<TabId>('visao')

  const processoAberto = !PROCESSO_ENCERRADOS.has(processo.status)
  const processoBase = `/saude/tfd/processos/${processo.id}`

  const solicitacoesColumns = useMemo<
    ColumnDef<ProcessoTfdDetalheOutput['solicitacoes'][number]>[]
  >(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => <ProtocoloBadge protocolo={row.original.protocolo} />,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          isTfdStatus(row.original.status) ? (
            <StatusBadge status={row.original.status} />
          ) : (
            <span className="text-[var(--color-text-muted)]">{row.original.status}</span>
          ),
      },
      {
        id: 'urgencia',
        header: 'Urgência',
        cell: ({ row }) =>
          isTfdUrgencia(row.original.urgencia) ? (
            <UrgenciaBadge urgencia={row.original.urgencia} />
          ) : (
            <span className="text-[var(--color-text-muted)]">{row.original.urgencia}</span>
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
        id: 'especialidade',
        header: 'Especialidade',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">{row.original.especialidade ?? '—'}</span>
        ),
      },
      {
        id: 'prestador',
        header: 'Prestador',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">{row.original.prestador ?? '—'}</span>
        ),
      },
      {
        id: 'criadoEm',
        header: 'Abertura',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'acao',
        header: '',
        cell: ({ row }) => (
          <Link
            href={`/saude/tfd/${row.original.id}`}
            className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
          >
            Ver solicitação
          </Link>
        ),
      },
    ],
    []
  )

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
    <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
        <div
          className="flex flex-wrap gap-[var(--space-1)] border-b border-[var(--color-border)]"
          role="tablist"
          aria-label="Seções do processo TFD"
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
                    Paciente
                  </dt>
                  <dd className="mt-1">
                    {processo.paciente ? (
                      <Link
                        href={`/saude/tfd/pacientes/${processo.paciente.id}`}
                        className="font-medium text-[var(--color-primary)] hover:underline"
                      >
                        {processo.paciente.nome}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </dd>
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
            <DataTable
              data={processo.solicitacoes}
              columns={solicitacoesColumns}
              pagination={{
                page: 1,
                perPage: Math.max(processo.solicitacoes.length, 1),
                total: processo.solicitacoes.length,
              }}
              onPaginationChange={() => {}}
              emptyMessage="Nenhuma solicitação neste processo"
              emptyDescription="Abra uma nova solicitação vinculada a este processo quando estiver em andamento."
            />
          </div>
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

      <aside className="flex min-w-0 flex-col gap-[var(--space-4)]">
        <Card header={<CardHeader>Paciente</CardHeader>}>
          {processo.paciente ? (
            <dl className="flex flex-col gap-[var(--space-3)]">
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Nome
                </dt>
                <dd className="mt-1 font-medium text-[var(--color-text)]">
                  {processo.paciente.nome}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  CNS
                </dt>
                <dd className="mt-1 font-mono text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {processo.paciente.cnsMascarado ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Data de nascimento
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">
                  {formatDate(processo.paciente.dataNascimento)}
                </dd>
              </div>
              <Link
                href={`/saude/tfd/pacientes/${processo.paciente.id}`}
                className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
              >
                Ver perfil completo
              </Link>
            </dl>
          ) : (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Paciente não vinculado.
            </p>
          )}
        </Card>

        <Card header={<CardHeader>Ações</CardHeader>}>
          <nav className="flex flex-col gap-[var(--space-2)]">
            <button
              type="button"
              className="text-left text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
              onClick={() => setTab('solicitacoes')}
            >
              Ver todas as solicitações
            </button>
            <button
              type="button"
              className="text-left text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
              onClick={() => setTab('agendamentos')}
            >
              Ver todos os agendamentos
            </button>
          </nav>
        </Card>
      </aside>
    </div>
  )
}
