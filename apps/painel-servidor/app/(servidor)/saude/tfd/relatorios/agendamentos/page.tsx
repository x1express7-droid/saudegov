import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getAgendamentosConsulta, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RelatorioAgendamentosView } from './components/relatorio-agendamentos-view'

// BLOCO-13-RELATORIOS
export const metadata: Metadata = {
  title: 'Relatórios — Agendamentos TFD',
}

export default async function RelatorioAgendamentosPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const agendamentosResult = await getAgendamentosConsulta({ perPage: 100 })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Agendamentos"
        subtitulo="Consultas agendadas por período e status."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Relatórios', href: '/saude/tfd/relatorios' },
          { label: 'Agendamentos' },
        ]}
      />
      <RelatorioAgendamentosView
        agendamentos={agendamentosResult.items}
        totalAgendamentos={agendamentosResult.total}
      />
    </div>
  )
}
