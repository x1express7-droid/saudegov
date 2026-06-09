import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getSaldosTfd, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { notFound } from 'next/navigation'

import { SaldoDetalheView } from '../components/saldo-detalhe-view'

// BLOCO-11-SALDOS
interface SaldoDetalhePageProps {
  params: Promise<{ id: string }>
}

export default async function SaldoDetalhePage({ params }: SaldoDetalhePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const { id } = await params
  const items = await getSaldosTfd({ incluirInativos: true })
  const saldo = items.find((item) => item.id === id)

  if (!saldo) {
    notFound()
  }

  return <SaldoDetalheView saldo={saldo} session={session} />
}
