import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getCidsTfd, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import { notFound } from 'next/navigation'

import { CidTable } from './components/cid-table'

interface CidsPageProps {
  searchParams: Promise<{ page?: string; ativo?: string }>
}

export default async function CidsPage({ searchParams }: CidsPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.CONFIGURAR_CIDS)

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  let ativo: boolean | undefined
  if (params.ativo === '1') {
    ativo = true
  } else if (params.ativo === '0') {
    ativo = false
  }

  const { items, total, perPage } = await getCidsTfd({ page, perPage: 20, ativo })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="CIDs"
        subtitulo="Cadastre os códigos CID disponíveis nas solicitações de TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Configurações' },
          { label: 'CIDs' },
        ]}
      />
      <CidTable items={items} pagination={{ page, perPage, total }} ativoFilter={ativo} />
    </div>
  )
}
