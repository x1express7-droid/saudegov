import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getDashboardFinanceiroTfd,
  getDashboardTfd,
  getSaldosTfd,
  TFD_PERMISSIONS,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RelatorioFinanceiroView } from './components/relatorio-financeiro-view'

// BLOCO-13-RELATORIOS
export const metadata: Metadata = {
  title: 'Relatórios — Financeiro TFD',
}

export default async function RelatorioFinanceiroPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const [saldos, financeiro, dashboard] = await Promise.all([
    getSaldosTfd({ incluirInativos: true }),
    getDashboardFinanceiroTfd(),
    getDashboardTfd(),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Financeiro"
        subtitulo="Saldos, reservas, consumo e prestações de contas."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Relatórios', href: '/saude/tfd/relatorios' },
          { label: 'Financeiro' },
        ]}
      />
      <RelatorioFinanceiroView
        saldos={saldos}
        financeiro={financeiro}
        dashboard={{ prestacoesPendentes: dashboard.prestacoesPendentes }}
      />
    </div>
  )
}
