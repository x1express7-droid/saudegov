import { hasPermission } from '@saude/core-auth'
import type { SaudeMunicSession } from '@saude/core-auth'

import { TFD_PERMISSIONS, type TfdPermissionKey } from '../permissions'

/** Itens do submenu Financeiro no módulo TFD — §7.5 AUTH_PERMISSIONS.md */
export const TFD_FINANCEIRO_NAV_ITEMS = [
  {
    label: 'Saldos',
    href: '/saude/tfd/configuracoes/saldos',
    permission: TFD_PERMISSIONS.GERENCIAR_SALDO,
  },
  {
    label: 'Prestações de contas',
    href: '/saude/tfd/prestacoes',
    permission: TFD_PERMISSIONS.APROVAR_PRESTACAO,
  },
  {
    label: 'Relatórios',
    href: '/saude/tfd/dashboard',
    permission: TFD_PERMISSIONS.EXPORTAR_RELATORIO,
  },
] as const satisfies ReadonlyArray<{
  label: string
  href: string
  permission: TfdPermissionKey
}>

export type TfdFinanceiroNavItem = {
  label: string
  href: string
}

export function getTfdFinanceiroVisibleNav(
  session: SaudeMunicSession
): TfdFinanceiroNavItem[] {
  return TFD_FINANCEIRO_NAV_ITEMS.filter((item) =>
    hasPermission(session, item.permission)
  ).map(({ label, href }) => ({ label, href }))
}

/** Rotas financeiras sob `/configuracoes` (ex.: saldos) — guard no layout sem aba no nav de config. */
export function matchTfdFinanceiroConfigPath(pathname: string): TfdPermissionKey | null {
  const saldosPath = '/saude/tfd/configuracoes/saldos'
  if (pathname === saldosPath || pathname.startsWith(`${saldosPath}/`)) {
    return TFD_PERMISSIONS.GERENCIAR_SALDO
  }
  return null
}
