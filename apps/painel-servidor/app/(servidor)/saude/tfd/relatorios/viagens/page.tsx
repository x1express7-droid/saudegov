import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getDashboardTfd,
  getMotoristasRelatorioOpcoesTfd,
  getPrestadoresRelatorioOpcoesTfd,
  getViagensTfd,
  TFD_PERMISSIONS,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RelatorioViagensView } from './components/relatorio-viagens-view'

// BLOCO-13-RELATORIOS
export const metadata: Metadata = {
  title: 'Relatórios — Viagens TFD',
}

export default async function RelatorioViagensPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const [viagensResult, dashboard, prestadoresOpcoes, motoristasOpcoes] = await Promise.all([
    getViagensTfd({ perPage: 100 }),
    getDashboardTfd(),
    getPrestadoresRelatorioOpcoesTfd(),
    getMotoristasRelatorioOpcoesTfd(),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Viagens"
        subtitulo="Deslocamentos realizados, passageiros e motoristas."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Relatórios', href: '/saude/tfd/relatorios' },
          { label: 'Viagens' },
        ]}
      />
      <RelatorioViagensView
        viagens={viagensResult.items}
        viagensProximos7Dias={dashboard.viagensProximos7Dias}
        prestadoresOpcoes={prestadoresOpcoes}
        motoristasOpcoes={motoristasOpcoes}
      />
    </div>
  )
}
