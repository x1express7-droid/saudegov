import type { UserRole } from '@saude/core-auth'
import {
  TFD_GRANULAR_PERMISSION_DEFINITIONS,
  type TfdPermissionDefinition,
} from '@saude/mod-saude-tfd'

export interface PermissaoCatalogoItem {
  key: string
  label: string
  descricao: string
  minRole: 'SERVIDOR' | 'GESTOR'
}

const ROLE_LEVEL: Record<'SERVIDOR' | 'GESTOR' | 'ADMIN', number> = {
  SERVIDOR: 1,
  GESTOR: 2,
  ADMIN: 3,
}

const CATALOGO_POR_MODULO: Record<string, readonly TfdPermissionDefinition[]> = {
  'saude.tfd': TFD_GRANULAR_PERMISSION_DEFINITIONS,
}

export function getCatalogoPermissoesModulo(moduloChave: string): PermissaoCatalogoItem[] {
  const definitions = CATALOGO_POR_MODULO[moduloChave]
  if (!definitions) {
    return []
  }

  return definitions.map((item) => ({
    key: item.key,
    label: item.label,
    descricao: item.descricao,
    minRole: item.minRole as 'SERVIDOR' | 'GESTOR',
  }))
}

export function isModuloComCatalogo(moduloChave: string): boolean {
  return moduloChave in CATALOGO_POR_MODULO
}

export function filtrarCatalogoPorPapel(
  catalogo: PermissaoCatalogoItem[],
  role: 'GESTOR' | 'SERVIDOR'
): PermissaoCatalogoItem[] {
  const nivel = ROLE_LEVEL[role]
  return catalogo.filter((item) => nivel >= ROLE_LEVEL[item.minRole])
}

export function podeAtribuirPermissao(
  role: 'GESTOR' | 'SERVIDOR',
  minRole: 'SERVIDOR' | 'GESTOR'
): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minRole]
}

export function chavesPermitidasModulo(moduloChave: string): Set<string> {
  return new Set(getCatalogoPermissoesModulo(moduloChave).map((item) => item.key))
}

export function parsePermissionsJson(value: unknown): Record<string, boolean> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  const result: Record<string, boolean> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'boolean') {
      result[key] = val
    }
  }
  return result
}

export function filtrarPermissoesModulo(
  permissions: Record<string, boolean>,
  moduloChave: string
): Record<string, boolean> {
  const prefix = `${moduloChave}.`
  const result: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(permissions)) {
    if (key.startsWith(prefix)) {
      result[key] = value
    }
  }
  return result
}

export type ServidorRolePermissoes = Extract<UserRole, 'GESTOR' | 'SERVIDOR'>
