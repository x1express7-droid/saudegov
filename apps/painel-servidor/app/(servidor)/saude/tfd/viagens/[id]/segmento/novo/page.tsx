import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getViagemDetalhe } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SegmentoTransporteForm } from '../../../../processos/[id]/agendamentos/[agId]/transporte/novo/components/segmento-transporte-form'

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

  const detalheViagemHref = `/saude/tfd/viagens/${viagemId}`

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Novo segmento de deslocamento"
        subtitulo={`Viagem ${viagem.protocolo} — ${viagem.origemDescricao} → ${viagem.destinoDescricao}`}
        breadcrumbs={[
          { label: 'Viagens', href: '/saude/tfd/viagens' },
          { label: viagem.protocolo, href: detalheViagemHref },
          { label: 'Novo segmento' },
        ]}
      />

      <SegmentoTransporteForm
        session={session}
        viagemId={viagemId}
        viagemVeiculo={
          viagem.veiculo
            ? {
                id: viagem.veiculo.id,
                placa: viagem.veiculo.placa,
                modelo: viagem.veiculo.modelo,
              }
            : null
        }
        viagemMotorista={
          viagem.motorista
            ? {
                id: viagem.motorista.id,
                nome: viagem.motorista.userNome,
              }
            : null
        }
        successRedirectPath={detalheViagemHref}
      />
    </div>
  )
}
