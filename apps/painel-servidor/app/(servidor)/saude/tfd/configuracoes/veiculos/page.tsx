import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getVeiculosTfd, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import { notFound } from 'next/navigation'
import { VeiculoTable } from './components/veiculo-table'

interface VeiculosPageProps {
  searchParams: Promise<{ page?: string; ativo?: string }>
}

export default async function VeiculosPage({ searchParams }: VeiculosPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_FROTA)

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  let ativo: boolean | undefined
  if (params.ativo === '1') {
    ativo = true
  } else if (params.ativo === '0') {
    ativo = false
  }

  const { items, total, perPage } = await getVeiculosTfd({ page, perPage: 20, ativo })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Veículos"
        subtitulo="Cadastre a frota municipal utilizada nos agendamentos de TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Configurações' },
          { label: 'Veículos' },
        ]}
      />
      <VeiculoTable items={items} pagination={{ page, perPage, total }} ativoFilter={ativo} />
    </div>
  )
}
