import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import {
  getPrestadoresTfd,
  getViagemDetalhe,
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

function pickMunicipioSede(settings: unknown): { cidade: string; estado: string } | null {
  if (typeof settings !== 'object' || settings === null) {
    return null
  }

  const record = settings as Record<string, unknown>
  const cidade =
    typeof record.municipio_origem_cidade === 'string'
      ? record.municipio_origem_cidade.trim()
      : typeof record.municipioOrigemCidade === 'string'
        ? record.municipioOrigemCidade.trim()
        : ''
  const estado =
    typeof record.municipio_origem_estado === 'string'
      ? record.municipio_origem_estado.trim()
      : typeof record.municipioOrigemEstado === 'string'
        ? record.municipioOrigemEstado.trim()
        : ''

  if (!cidade || !estado) {
    return null
  }

  return { cidade, estado }
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

  const db = await getPrismaForTenant(session.user.tenantId!)
  const tenantRow = await db.tenant.findUnique({
    where: { id: session.user.tenantId! },
    select: { settings: true },
  })
  const municipioSede = pickMunicipioSede(tenantRow?.settings)

  const prestadoresResult = await getPrestadoresTfd({
    ativo: true,
    perPage: CATALOGO_PER_PAGE,
  })

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
        prestadores={prestadoresResult.items}
        municipioSede={municipioSede}
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
