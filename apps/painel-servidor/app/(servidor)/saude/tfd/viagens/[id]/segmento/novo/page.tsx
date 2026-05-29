import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getPrestadoresTfd,
  getViagemDetalhe,
  getVeiculosAgendamentoTfd,
  TFD_CATALOGO_OPCOES_PER_PAGE,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SegmentoTransporteForm } from '../../../../processos/[id]/agendamentos/[agId]/transporte/novo/components/segmento-transporte-form'

const CATALOGO_PER_PAGE = TFD_CATALOGO_OPCOES_PER_PAGE

interface NovoSegmentoViagemPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: NovoSegmentoViagemPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Novo segmento de deslocamento',
    description: `Segmento da viagem ${id}`,
  }
}

export default async function NovoSegmentoViagemPage({ params }: NovoSegmentoViagemPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id: viagemId } = await params
  const viagem = await getViagemDetalhe(viagemId)

  if (!viagem) {
    notFound()
  }

  if (
    viagem.status !== 'PLANEJADA' &&
    viagem.status !== 'CONFIRMADA' &&
    viagem.status !== 'EM_ANDAMENTO'
  ) {
    notFound()
  }

  const vagasOcupadas = viagem.passageiros.reduce(
    (total, passageiro) => total + 1 + passageiro.acompanhantesCount,
    0
  )
  const minCapacidade = Math.max(vagasOcupadas, 1)

  const [prestadoresResult, veiculos] = await Promise.all([
    getPrestadoresTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
    getVeiculosAgendamentoTfd(false, minCapacidade),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Novo segmento de deslocamento"
        subtitulo={`Viagem ${viagem.protocolo} — ${viagem.origemDescricao} → ${viagem.destinoDescricao}`}
        breadcrumbs={[
          { label: 'Viagens', href: '/saude/tfd/viagens' },
          { label: viagem.protocolo, href: `/saude/tfd/viagens/${viagemId}?tab=segmentos` },
          { label: 'Novo segmento' },
        ]}
      />

      <SegmentoTransporteForm
        session={session}
        viagemId={viagemId}
        prestadores={prestadoresResult.items}
        veiculos={veiculos}
        successRedirectPath={`/saude/tfd/viagens/${viagemId}?tab=segmentos`}
      />
    </div>
  )
}
