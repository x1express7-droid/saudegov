import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getAgendamentoDetalhe,
  getSolicitacaoTfd,
  getTransportesPorAgendamento,
} from '@saude/mod-saude-tfd'
import {
  Card,
  CardHeader,
  PageHeader,
  ProtocoloBadge,
  UrgenciaBadge,
  type TfdUrgencia,
} from '@saude/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AgendamentoStatusBadge } from '../../../../components/agendamento-status-badge'
import { PRESTACAO_STATUS_CONFIG } from './components/transporte-constants'
import { AgendamentoAcoesSidebar } from './components/agendamento-acoes-sidebar'
import { TransportesSection } from './components/transportes-section'

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

function isTfdUrgencia(value: string): value is TfdUrgencia {
  return value in
    {
      BAIXA: true,
      INTERMEDIARIA: true,
      GRAVE: true,
      MUITO_URGENTE: true,
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

function labelPrestador(
  prestador: {
    nome: string | null
    cidade: string | null
    estado: string | null
  } | null
): string {
  if (!prestador?.nome) {
    return '—'
  }
  if (prestador.cidade && prestador.estado) {
    return `${prestador.nome} (${prestador.cidade}/${prestador.estado})`
  }
  return prestador.nome
}

interface AgendamentoDetalhePageProps {
  params: Promise<{ id: string; agId: string }>
}

export async function generateMetadata({ params }: AgendamentoDetalhePageProps): Promise<Metadata> {
  const { agId } = await params
  return {
    title: 'Detalhe do agendamento TFD',
    description: `Agendamento ${agId}`,
  }
}

export default async function AgendamentoDetalhePage({ params }: AgendamentoDetalhePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id: processoId, agId } = await params

  const agendamento = await getAgendamentoDetalhe(agId)
  if (!agendamento || agendamento.processoId !== processoId) {
    notFound()
  }

  const solicitacao = await getSolicitacaoTfd(agendamento.solicitacaoId)
  if (!solicitacao) {
    notFound()
  }

  const protocolo = agendamento.protocolo
  const protocoloSolicitacao = solicitacao.protocolo

  const transportes = await getTransportesPorAgendamento(agId)

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={`Agendamento ${agendamento.sequencia}`}
        subtitulo="Consulta vinculada ao processo TFD."
        breadcrumbs={[
          { label: 'Processos TFD', href: '/saude/tfd' },
          { label: protocoloSolicitacao, href: `/saude/tfd/${solicitacao.id}` },
          { label: `Agendamento ${agendamento.sequencia}` },
        ]}
        acoes={
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <ProtocoloBadge protocolo={protocolo} />
            <AgendamentoStatusBadge status={agendamento.status} />
            {isTfdUrgencia(solicitacao.urgencia) ? (
              <UrgenciaBadge urgencia={solicitacao.urgencia} />
            ) : null}
          </div>
        }
      />

      <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
          <Card header={<CardHeader>Dados do agendamento</CardHeader>}>
            <dl className="grid gap-[var(--space-3)] sm:grid-cols-2">
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Data / hora
                </dt>
                <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {formatDataConsulta(agendamento.dataConsulta, agendamento.horaConsulta)}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Tipo de atendimento
                </dt>
                <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {TIPO_ATENDIMENTO_LABEL[agendamento.tipoAtendimento] ??
                    agendamento.tipoAtendimento}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Prestador
                </dt>
                <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {labelPrestador(agendamento.prestador)}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Profissional
                </dt>
                <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {agendamento.profissionalNome ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Acompanhante
                </dt>
                <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {agendamento.acompanhante.nome ?? '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Orientações
                </dt>
                <dd className="whitespace-pre-wrap text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {agendamento.orientacoes?.trim() || '—'}
                </dd>
              </div>
            </dl>
          </Card>

          <TransportesSection
            session={session}
            processoId={processoId}
            agendamentoId={agId}
            transportes={transportes}
          />

          <Card header={<CardHeader>Prestação de contas</CardHeader>}>
            {agendamento.prestacaoConta ? (
              <div className="flex flex-col gap-[var(--space-2)]">
                <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  <Link
                    href={`/saude/tfd/processos/${processoId}/agendamentos/${agId}/prestacao`}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Abrir prestação de contas do agendamento
                  </Link>
                </p>
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  Status:{' '}
                  {PRESTACAO_STATUS_CONFIG[agendamento.prestacaoConta.status]?.label ??
                    agendamento.prestacaoConta.status}
                  {' · '}
                  Prazo de envio até{' '}
                  {new Date(agendamento.prestacaoConta.prazoEnvioAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ) : (
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {agendamento.status === 'REALIZADO'
                  ? 'Prestação de contas em abertura.'
                  : 'Aguardando registro de retorno para abrir a prestação de contas.'}
              </p>
            )}
          </Card>
        </div>

        <aside className="min-w-0">
          <AgendamentoAcoesSidebar
            session={session}
            agendamentoId={agendamento.id}
            status={agendamento.status}
          />
        </aside>
      </div>
    </div>
  )
}
