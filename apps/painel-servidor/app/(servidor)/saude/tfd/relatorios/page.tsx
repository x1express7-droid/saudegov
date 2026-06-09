import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RelatorioHubView } from './components/relatorio-hub-view'

// BLOCO-12-RELATORIOS
// BLOCO-13-RELATORIOS
export const metadata: Metadata = {
  title: 'Relatórios TFD',
}

export default async function RelatoriosTfdPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Relatórios TFD"
        subtitulo="Selecione um módulo para visualizar dados analíticos e exportar relatórios."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Relatórios' },
        ]}
      />
      <RelatorioHubView />
    </div>
  )
}
