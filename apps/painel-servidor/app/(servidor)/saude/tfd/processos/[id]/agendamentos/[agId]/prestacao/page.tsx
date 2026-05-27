import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getAgendamentoDetalhe,
  getExtratoAgendamento,
  getPrestacaoDetalheAgendamento,
  getSolicitacaoTfd,
  getTransportesPorAgendamento,
} from '@saude/mod-saude-tfd'
import { Card, CardHeader, EmptyState, PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PrestacaoAgendamentoConteudo } from './components/prestacao-agendamento-conteudo'

function formatDataConsultaLabel(iso: string, hora: string | null): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  const data = new Date(parsed).toLocaleDateString('pt-BR')
  return hora ? `${data} às ${hora}` : data
}

interface PrestacaoAgendamentoPageProps {
  params: Promise<{ id: string; agId: string }>
}

export async function generateMetadata({ params }: PrestacaoAgendamentoPageProps): Promise<Metadata> {
  const { agId } = await params
  return {
    title: 'Prestação de contas do agendamento',
    description: `Prestação de contas ${agId}`,
  }
}

export default async function PrestacaoAgendamentoPage({ params }: PrestacaoAgendamentoPageProps) {
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

  const [solicitacao, prestacao, extrato, transportes] = await Promise.all([
    getSolicitacaoTfd(agendamento.solicitacaoId),
    getPrestacaoDetalheAgendamento(agId),
    getExtratoAgendamento(agId),
    getTransportesPorAgendamento(agId),
  ])

  if (!solicitacao) {
    notFound()
  }

  const dataLabel = formatDataConsultaLabel(
    agendamento.dataConsulta,
    agendamento.horaConsulta
  )

  if (!prestacao) {
    return (
      <div className="flex flex-col gap-[var(--space-6)]">
        <PageHeader
          titulo="Prestação de contas"
          subtitulo={`Agendamento ${agendamento.sequencia} — ${dataLabel}`}
          breadcrumbs={[
            { label: 'Processos TFD', href: '/saude/tfd' },
            { label: solicitacao.protocolo, href: `/saude/tfd/${solicitacao.id}` },
            {
              label: `Agendamento ${agendamento.sequencia}`,
              href: `/saude/tfd/processos/${processoId}/agendamentos/${agId}`,
            },
            { label: 'Prestação de contas' },
          ]}
        />
        <Card header={<CardHeader>Prestação de contas</CardHeader>}>
          <EmptyState
            titulo="Prestação ainda não disponível"
            descricao={
              agendamento.status === 'REALIZADO'
                ? 'A prestação de contas está sendo aberta para este agendamento.'
                : 'Registre o retorno do agendamento para abrir a prestação de contas.'
            }
            cta={
              <Link
                href={`/saude/tfd/processos/${processoId}/agendamentos/${agId}`}
                className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
              >
                Voltar ao agendamento
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  if (!extrato) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Prestação de contas"
        subtitulo={`Agendamento ${agendamento.sequencia} — ${dataLabel}`}
        breadcrumbs={[
          { label: 'Processos TFD', href: '/saude/tfd' },
          { label: solicitacao.protocolo, href: `/saude/tfd/${solicitacao.id}` },
          {
            label: `Agendamento ${agendamento.sequencia}`,
            href: `/saude/tfd/processos/${processoId}/agendamentos/${agId}`,
          },
          { label: 'Prestação de contas' },
        ]}
      />

      <PrestacaoAgendamentoConteudo
        session={session}
        processoId={processoId}
        agendamentoId={agId}
        agendamentoStatus={agendamento.status}
        solicitacaoStatus={solicitacao.status}
        prestacao={prestacao}
        extrato={extrato}
        transportes={transportes}
      />
    </div>
  )
}
