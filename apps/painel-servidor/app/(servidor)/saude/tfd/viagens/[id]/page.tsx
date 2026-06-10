import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import {
  getPrestacaoDetalheViagemNova,
  getViagemDetalhe,
  getViagemFinanceiroPc,
} from '@saude/mod-saude-tfd'
import { formatDateHoraBr, PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ViagemStatusBadge } from '../../components/viagem-status-badge'
import { ViagemDetalheView } from './components/viagem-detalhe-view'

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

  const [prestacao, financeiro] = await Promise.all([
    viagem.status === 'CONCLUIDA' ? getPrestacaoDetalheViagemNova(id) : Promise.resolve(null),
    getViagemFinanceiroPc(id),
  ])

  // REMOVE-PROCESSO-PARTE-4: reserva via processos dos passageiros (agendamentos vinculados)
  const db = await getPrismaForTenant(session.user.tenantId!)
  const agendamentoIds = viagem.passageiros.map((passageiro) => passageiro.agendamentoId)
  const processoIds =
    agendamentoIds.length > 0
      ? [
          ...new Set(
            (
              await db.tfdAgendamento.findMany({
                where: {
                  id: { in: agendamentoIds },
                  tenant_id: session.user.tenantId!,
                },
                select: { processo_id: true },
              })
            ).map((agendamento) => agendamento.processo_id)
          ),
        ]
      : []

  // PC-PARTE-3: processo para upload de comprovantes na PC da viagem
  const processoIdForUpload = processoIds[0] ?? null

  // BLOCO-3: aba Segmentos removida — links antigos abrem Detalhes
  const initialTab =
    tab === 'prestacao'
      ? 'prestacao'
      : tab === 'financeiro'
        ? 'financeiro'
        : tab === 'segmentos'
          ? 'detalhes'
          : undefined

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={viagem.protocolo}
        subtitulo={`Saída: ${formatDateHoraBr(viagem.dataSaida, viagem.horaSaida)} · ${viagem.origemDescricao} → ${viagem.destinoDescricao}`}
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
        financeiro={financeiro}
        processoIdForUpload={processoIdForUpload}
        initialTab={initialTab}
      />
    </div>
  )
}
