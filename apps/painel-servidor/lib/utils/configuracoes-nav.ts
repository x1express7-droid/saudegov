import { hasPermission } from '@saude/core-auth'
import type { SaudeMunicSession } from '@saude/core-auth'

import { CONFIG_PERMISSIONS } from '../permissions'

/** Abas de configuração municipal (ADMIN) — ordem de prioridade para redirect. */
export const CONFIGURACOES_NAV_ITEMS = [
  {
    label: 'Organograma',
    href: '/configuracoes/organograma',
    permission: CONFIG_PERMISSIONS.ORGANOGRAMA,
  },
  {
    label: 'Responsáveis',
    href: '/configuracoes/responsaveis',
    permission: CONFIG_PERMISSIONS.RESPONSAVEIS,
  },
  {
    label: 'Servidores',
    href: '/configuracoes/servidores',
    permission: CONFIG_PERMISSIONS.SERVIDORES,
  },
  {
    label: 'Tema',
    href: '/configuracoes/tema',
    permission: CONFIG_PERMISSIONS.TEMA,
  },
  {
    label: 'Município',
    href: '/configuracoes/municipio',
    permission: CONFIG_PERMISSIONS.MUNICIPIO,
  },
] as const satisfies ReadonlyArray<{
  label: string
  href: string
  permission: (typeof CONFIG_PERMISSIONS)[keyof typeof CONFIG_PERMISSIONS]
}>

export type ConfiguracoesNavItem = {
  label: string
  href: string
}

export function getConfiguracoesVisibleNav(session: SaudeMunicSession): ConfiguracoesNavItem[] {
  return CONFIGURACOES_NAV_ITEMS.filter((item) =>
    hasPermission(session, item.permission)
  ).map(({ label, href }) => ({ label, href }))
}

export function resolveConfiguracoesHref(session: SaudeMunicSession): string | null {
  for (const item of CONFIGURACOES_NAV_ITEMS) {
    if (hasPermission(session, item.permission)) {
      return item.href
    }
  }
  return null
}

export function matchConfiguracoesPath(pathname: string): string | null {
  for (const item of CONFIGURACOES_NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.permission
    }
  }
  return null
}
