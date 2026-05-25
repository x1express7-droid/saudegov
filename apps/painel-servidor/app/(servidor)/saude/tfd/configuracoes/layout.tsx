import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import { notFound } from 'next/navigation'

import { TfdConfiguracoesNav } from './components/tfd-configuracoes-nav'

const TFD_CONFIGURACOES_NAV = [
  {
    label: 'Especialidades',
    href: '/saude/tfd/configuracoes/especialidades',
    permission: TFD_PERMISSIONS.CONFIGURAR_ESPECIALIDADES,
  },
  {
    label: 'Prestadores',
    href: '/saude/tfd/configuracoes/prestadores',
    permission: TFD_PERMISSIONS.CONFIGURAR_PRESTADORES,
  },
  {
    label: 'Procedimentos',
    href: '/saude/tfd/configuracoes/procedimentos',
    permission: TFD_PERMISSIONS.CONFIGURAR_PROCEDIMENTOS,
  },
  {
    label: 'Veículos',
    href: '/saude/tfd/configuracoes/veiculos',
    permission: TFD_PERMISSIONS.GERENCIAR_FROTA,
  },
  {
    label: 'Motoristas',
    href: '/saude/tfd/configuracoes/motoristas',
    permission: TFD_PERMISSIONS.GERENCIAR_FROTA,
  },
  {
    label: 'Saldos',
    href: '/saude/tfd/configuracoes/saldos',
    permission: TFD_PERMISSIONS.GERENCIAR_SALDO,
  },
] as const

export default async function TfdConfiguracoesLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')

  const visibleNav = TFD_CONFIGURACOES_NAV.filter((item) =>
    hasPermission(session, item.permission)
  ).map(({ label, href }) => ({ label, href }))

  return (
    <div className="flex flex-col gap-8">
      <TfdConfiguracoesNav items={visibleNav} />
      {children}
    </div>
  )
}
