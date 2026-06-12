import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import {
  calcMinDataAgendamentoAposAprovacao,
  getAgendamentoDetalhe,
  getAcompanhantesSolicitacao,
  getPrestadoresTfd,
  getSolicitacaoTfd,
  getTransportesPorAgendamento,
  podeEditarAgendamentoDados,
  TFD_CATALOGO_OPCOES_PER_PAGE,
} from '@saude/mod-saude-tfd'
import { PageHeader, ProtocoloBadge, UrgenciaBadge, type TfdUrgencia } from '@saude/ui'
import { formatInTimeZone } from 'date-fns-tz'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AgendamentoStatusBadge } from '../../../../components/agendamento-status-badge'
import { AgendamentoAcoesSidebar } from './components/agendamento-acoes-sidebar'
import { AgendamentoDadosSection } from './components/agendamento-dados-section'
import { DeslocamentoSection } from './components/deslocamento-section'
import { SegmentosHistoricosLegadoAccordion } from './components/segmentos-historicos-legado-accordion'

const CATALOGO_PER_PAGE = TFD_CATALOGO_OPCOES_PER_PAGE
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

function resolveTenantTimezone(settings: unknown): string {
  if (typeof settings !== 'object' || settings === null) {
    return DEFAULT_TIMEZONE
  }
  const timezone = (settings as Record<string, unknown>).timezone
  return typeof timezone === 'string' && timezone.trim() !== ''
    ? timezone.trim()
    : DEFAULT_TIMEZONE
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

  const db = await getPrismaForTenant(session.user.tenantId!)
  const [tenantRow, solicitacaoAprovacao, prestadoresResult, acompanhantes, transportesLegado] =
    await Promise.all([
      db.tenant.findUnique({
        where: { id: session.user.tenantId! },
        select: { settings: true },
      }),
      db.tfdSolicitacao.findFirst({
        where: { id: solicitacao.id, tenant_id: session.user.tenantId! },
        select: { decidido_at: true, created_at: true },
      }),
      getPrestadoresTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
      getAcompanhantesSolicitacao(solicitacao.id),
      getTransportesPorAgendamento(agId),
    ])

  const timezone = resolveTenantTimezone(tenantRow?.settings)
  const dataReferenciaAprovacao =
    solicitacaoAprovacao?.decidido_at ?? solicitacaoAprovacao?.created_at ?? new Date()
  const minimoPermitido = calcMinDataAgendamentoAposAprovacao(dataReferenciaAprovacao, timezone)
  const minDataConsulta = formatInTimeZone(minimoPermitido, timezone, 'yyyy-MM-dd')
  const minDataConsultaLabel = formatInTimeZone(minimoPermitido, timezone, 'dd/MM/yyyy')
  const podeEditar = podeEditarAgendamentoDados(
    agendamento.status,
    agendamento.dataConsulta,
    timezone
  )

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

      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Após criar ou vincular uma viagem, o deslocamento ficará visível nesta página.
      </p>

      <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
          <AgendamentoDadosSection
            session={session}
            agendamento={agendamento}
            podeEditar={podeEditar}
            minDataConsulta={minDataConsulta}
            minDataConsultaLabel={minDataConsultaLabel}
            prestadores={prestadoresResult.items}
            acompanhantes={acompanhantes}
          />

          <DeslocamentoSection
            session={session}
            agendamentoId={agId}
            dataConsulta={agendamento.dataConsulta}
            viagensVinculadas={agendamento.viagensVinculadas}
          />

          <SegmentosHistoricosLegadoAccordion transportesLegado={transportesLegado} />
        </div>

        <aside className="min-w-0">
          <AgendamentoAcoesSidebar
            session={session}
            agendamentoId={agendamento.id}
            status={agendamento.status}
            viagensVinculadas={agendamento.viagensVinculadas}
          />
        </aside>
      </div>
    </div>
  )
}
