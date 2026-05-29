import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getPrestacaoDetalheViagemNova,
  getViagemDetalhe,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ViagemStatusBadge } from '../../components/viagem-status-badge'
import { ViagemDetalheView } from './components/viagem-detalhe-view'

function formatDataSaida(data: string, hora: string | null): string {
  const parsed = data.length === 10 ? `${data}T12:00:00` : data
  const label = new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return hora ? `${label} às ${hora}` : label
}

interface ViagemDetalhePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: ViagemDetalhePageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Detalhe da viagem TFD',
    description: `Viagem ${id}`,
  }
}

export default async function ViagemDetalhePage({ params, searchParams }: ViagemDetalhePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id } = await params
  const { tab } = await searchParams
  const viagem = await getViagemDetalhe(id)

  if (!viagem) {
    notFound()
  }

  const prestacao =
    viagem.status === 'CONCLUIDA'
      ? await getPrestacaoDetalheViagemNova(id)
      : null

  const initialTab =
    tab === 'prestacao' ? 'prestacao' : tab === 'segmentos' ? 'segmentos' : undefined

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={viagem.protocolo}
        subtitulo={`Saída: ${formatDataSaida(viagem.dataSaida, viagem.horaSaida)} · ${viagem.origemDescricao} → ${viagem.destinoDescricao}`}
        breadcrumbs={[
          { label: 'Viagens', href: '/saude/tfd/viagens' },
          { label: viagem.protocolo },
        ]}
        acoes={
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <ViagemStatusBadge status={viagem.status} />
          </div>
        }
      />

      <ViagemDetalheView
        session={session}
        viagem={viagem}
        prestacao={prestacao}
        initialTab={initialTab}
      />
    </div>
  )
}
