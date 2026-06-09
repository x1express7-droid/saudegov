import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getSaldosTfd, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import { notFound } from 'next/navigation'

import { SaldoLista } from './components/saldo-lista'

// BLOCO-11-SALDOS
// BLOCO-11.1-SALDOS
export default async function SaldosPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const items = await getSaldosTfd({ incluirInativos: true })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Saldos financeiros"
        subtitulo="Cadastre e acompanhe os recursos destinados ao TFD, com reservas e consumo em tempo real."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Saldos' },
        ]}
      />
      <SaldoLista items={items} session={session} />
    </div>
  )
}
