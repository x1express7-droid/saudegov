import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getAgendamentoDetalhe, getPrestadoresTfd, getSolicitacaoTfd, getVeiculosAgendamentoTfd, TFD_CATALOGO_OPCOES_PER_PAGE } from '@saude/mod-saude-tfd'
import { Alert, Button, PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SegmentoTransporteForm } from './components/segmento-transporte-form'

const CATALOGO_PER_PAGE = TFD_CATALOGO_OPCOES_PER_PAGE

function formatDataConsultaLabel(iso: string, hora: string | null): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  const data = new Date(parsed).toLocaleDateString('pt-BR')
  return hora ? `${data} às ${hora}` : data
}

interface NovoTransportePageProps {
  params: Promise<{ id: string; agId: string }>
}

export async function generateMetadata({ params }: NovoTransportePageProps): Promise<Metadata> {
  const { agId } = await params
  return {
    title: 'Novo segmento de transporte',
    description: `Transporte do agendamento ${agId}`,
  }
}

export default async function NovoTransportePage({ params }: NovoTransportePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id: processoId, agId: agendamentoId } = await params

  const agendamento = await getAgendamentoDetalhe(agendamentoId)
  if (!agendamento || agendamento.processoId !== processoId) {
    notFound()
  }

  if (agendamento.status === 'CANCELADO') {
    notFound()
  }

  const solicitacao = await getSolicitacaoTfd(agendamento.solicitacaoId)
  if (!solicitacao) {
    notFound()
  }

  const acompanhanteNecessario = solicitacao.acompanhante !== null

  const [prestadoresResult, veiculos] = await Promise.all([
    getPrestadoresTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
    getVeiculosAgendamentoTfd(acompanhanteNecessario),
  ])

  const dataLabel = formatDataConsultaLabel(
    agendamento.dataConsulta,
    agendamento.horaConsulta
  )

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Novo segmento de transporte"
        subtitulo={`Agendamento ${agendamento.sequencia} — ${dataLabel}`}
        breadcrumbs={[
          { label: 'Processos TFD', href: '/saude/tfd' },
          { label: solicitacao.protocolo, href: `/saude/tfd/${solicitacao.id}` },
          {
            label: `Agendamento ${agendamento.sequencia}`,
            href: `/saude/tfd/processos/${processoId}/agendamentos/${agendamentoId}`,
          },
          { label: 'Novo segmento' },
        ]}
      />

      <Alert variant="info" titulo="Deslocamento via Viagem TFD">
        <div className="flex flex-col gap-[var(--space-3)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            O deslocamento agora é gerenciado pela Viagem TFD. Use o botão abaixo para criar uma
            viagem e vincular este agendamento.
          </p>
          <Button asChild variant="primary" className="w-full sm:w-auto">
            <Link href={`/saude/tfd/viagens/nova?agendamentoId=${encodeURIComponent(agendamentoId)}`}>
              Criar viagem para este agendamento
            </Link>
          </Button>
        </div>
      </Alert>

      <div className="flex flex-col gap-[var(--space-3)]">
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          Adicionar segmento avulso (uso específico)
        </h2>
        <SegmentoTransporteForm
          session={session}
          processoId={processoId}
          agendamentoId={agendamentoId}
          prestadores={prestadoresResult.items}
          veiculos={veiculos}
        />
      </div>
    </div>
  )
}
