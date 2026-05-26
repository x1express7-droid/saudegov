import { hasPermission } from '@saude/core-auth'
import type { SaudeMunicSession } from '@saude/core-auth'

import { TFD_PERMISSIONS, type TfdPermissionKey } from '../permissions'

/** Abas de configuração TFD — ordem de prioridade para entrada no menu e redirect. */
export const TFD_CONFIGURACOES_NAV_ITEMS = [
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
] as const satisfies ReadonlyArray<{
  label: string
  href: string
  permission: TfdPermissionKey
}>

export type TfdConfiguracoesNavItem = {
  label: string
  href: string
}

/** Primeira aba de configuração TFD permitida para a sessão (sidebar e redirect). */
export function resolveTfdConfiguracoesHref(session: SaudeMunicSession): string | null {
  for (const item of TFD_CONFIGURACOES_NAV_ITEMS) {
    if (hasPermission(session, item.permission)) {
      return item.href
    }
  }
  return null
}

export function getTfdConfiguracoesVisibleNav(
  session: SaudeMunicSession
): TfdConfiguracoesNavItem[] {
  return TFD_CONFIGURACOES_NAV_ITEMS.filter((item) =>
    hasPermission(session, item.permission)
  ).map(({ label, href }) => ({ label, href }))
}

/** Verifica se o pathname corresponde a uma aba de configuração TFD. */
export function matchTfdConfiguracoesPath(pathname: string): TfdPermissionKey | null {
  for (const item of TFD_CONFIGURACOES_NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.permission
    }
  }
  return null
}
