import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getMotoristaDetalhe, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { Badge, PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { MotoristaDetalheView } from './components/motorista-detalhe-view'

interface MotoristaDetalhePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: MotoristaDetalhePageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Detalhe do motorista — TFD',
    description: `Motorista ${id}`,
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export default async function MotoristaDetalhePage({
  params,
  searchParams,
}: MotoristaDetalhePageProps) {
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

  const motorista = await getMotoristaDetalhe(id, { page })

  if (!motorista) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={motorista.nome}
        subtitulo={`CNH ${motorista.cnh} · Categoria ${motorista.cnhCategoria}`}
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd/dashboard' },
          { label: 'Configurações' },
          { label: 'Motoristas', href: '/saude/tfd/configuracoes/motoristas' },
          { label: motorista.nome },
        ]}
        acoes={
          <Badge variant={motorista.ativo ? 'green' : 'gray'}>
            {motorista.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        }
      />

      <MotoristaDetalheView motorista={motorista} />
    </div>
  )
}
