import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getVeiculoDetalhe, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { Badge, PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { VeiculoDetalheView } from './components/veiculo-detalhe-view'

interface VeiculoDetalhePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: VeiculoDetalhePageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Detalhe do veículo — TFD',
    description: `Veículo ${id}`,
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export default async function VeiculoDetalhePage({
  params,
  searchParams,
}: VeiculoDetalhePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_FROTA)

  const { id } = await params
  const query = await searchParams
  const page = parsePositiveInt(query.page, 1)

  const veiculo = await getVeiculoDetalhe(id, { page })

  if (!veiculo) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={veiculo.placa}
        subtitulo={`${veiculo.modelo} · Capacidade ${veiculo.capacidadePassageiros} passageiros`}
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd/dashboard' },
          { label: 'Configurações' },
          { label: 'Veículos', href: '/saude/tfd/configuracoes/veiculos' },
          { label: veiculo.placa },
        ]}
        acoes={
          <Badge variant={veiculo.ativo ? 'green' : 'gray'}>
            {veiculo.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        }
      />

      <VeiculoDetalheView veiculo={veiculo} />
    </div>
  )
}
