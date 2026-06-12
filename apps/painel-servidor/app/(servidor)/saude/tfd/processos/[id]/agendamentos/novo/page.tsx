import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import {
  calcMinDataAgendamentoAposAprovacao,
  getProcessoTfdDetalhe,
  getSolicitacaoTfd,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import { formatInTimeZone } from 'date-fns-tz'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AgendamentoNovoForm } from './components/agendamento-novo-form'

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

interface NovoAgendamentoPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ solicitacaoId?: string }>
}

function resolveTenantTimezone(settings: unknown): string {
  if (typeof settings !== 'object' || settings === null) {
    return DEFAULT_TIMEZONE
  }
  const timezone = (settings as Record<string, unknown>).timezone
  return typeof timezone === 'string' && timezone.trim() !== ''
    ? timezone.trim()
    : DEFAULT_TIMEZONE
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function generateMetadata({ params }: NovoAgendamentoPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Novo agendamento TFD',
    description: `Novo agendamento do processo ${id}`,
  }
}

export default async function NovoAgendamentoPage({
  params,
  searchParams,
}: NovoAgendamentoPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id: processoId } = await params
  const { solicitacaoId: solicitacaoIdParam } = await searchParams

  if (!solicitacaoIdParam || !isUuid(solicitacaoIdParam)) {
    notFound()
  }

  const solicitacao = await getSolicitacaoTfd(solicitacaoIdParam)
  if (!solicitacao || solicitacao.processoId !== processoId) {
    notFound()
  }

  if (solicitacao.status !== 'APROVADO' && solicitacao.status !== 'AGENDADO') {
    redirect(`/saude/tfd/${solicitacao.id}`)
  }

  const db = await getPrismaForTenant(session.user.tenantId!)
  const tenantRow = await db.tenant.findUnique({
    where: { id: session.user.tenantId! },
    select: { settings: true },
  })
  const timezone = resolveTenantTimezone(tenantRow?.settings)
  const solicitacaoAprovacao = await db.tfdSolicitacao.findFirst({
    where: { id: solicitacao.id, tenant_id: session.user.tenantId! },
    select: { decidido_at: true, created_at: true },
  })
  const dataReferenciaAprovacao =
    solicitacaoAprovacao?.decidido_at ?? solicitacaoAprovacao?.created_at ?? new Date()
  const minimoPermitido = calcMinDataAgendamentoAposAprovacao(dataReferenciaAprovacao, timezone)
  const minDataConsulta = formatInTimeZone(minimoPermitido, timezone, 'yyyy-MM-dd')
  const minDataConsultaLabel = formatInTimeZone(minimoPermitido, timezone, 'dd/MM/yyyy')

  const processo = await getProcessoTfdDetalhe(processoId)

  if (!processo) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      {/* BLOCO-1: subtítulo orienta que deslocamento é etapa posterior */}
      <PageHeader
        titulo="Novo agendamento"
        subtitulo="Registre a consulta médica. O deslocamento será organizado na etapa seguinte."
        breadcrumbs={[
          { label: 'Processos TFD', href: '/saude/tfd' },
          { label: processo.protocolo, href: `/saude/tfd/processos/${processoId}` },
          { label: 'Novo agendamento' },
        ]}
      />

      <AgendamentoNovoForm
        session={session}
        processoId={processoId}
        solicitacaoId={solicitacao.id}
        pacienteNome={processo.paciente?.nome ?? solicitacao.paciente.nome}
        protocoloProcesso={processo.protocolo}
        especialidadeNome={solicitacao.especialidade?.nome ?? 'Não informada'}
        minDataConsulta={minDataConsulta}
        minDataConsultaLabel={minDataConsultaLabel}
        tipoAtendimentoInicial={solicitacao.tipoAtendimento}
      />
    </div>
  )
}
