import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getDashboardTfd, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RelatorioSolicitacoesView } from './components/relatorio-solicitacoes-view'

// BLOCO-13-RELATORIOS
export const metadata: Metadata = {
  title: 'Relatórios — Solicitações TFD',
}

export default async function RelatorioSolicitacoesPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const dashboard = await getDashboardTfd()

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Solicitações"
        subtitulo="Indicadores analíticos e exportação de solicitações TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Relatórios', href: '/saude/tfd/relatorios' },
          { label: 'Solicitações' },
        ]}
      />
      <RelatorioSolicitacoesView dashboard={dashboard} />
    </div>
  )
}
