import { notFound } from 'next/navigation'
import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { ModuloPermissoesGrupo, PermissoesServidorContext } from '../types/permissoes.types'
import { getModulosAtivos } from './get-modulos-ativos'
import {
  filtrarCatalogoPorPapel,
  filtrarPermissoesModulo,
  getCatalogoPermissoesModulo,
  isModuloComCatalogo,
  parsePermissionsJson,
  type ServidorRolePermissoes,
} from '../utils/permissoes-catalogo'

const SERVIDOR_ROLES = ['GESTOR', 'SERVIDOR'] as ServidorRolePermissoes[]

export interface PermissoesServidorPageData {
  servidor: PermissoesServidorContext
  modulos: ModuloPermissoesGrupo[]
}

export async function getPermissoesServidor(
  servidorId: string
): Promise<PermissoesServidorPageData> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.PERMISSOES)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const row = await db.user.findFirst({
    where: {
      id: servidorId,
      tenant_id: tenantId,
      role: { in: SERVIDOR_ROLES },
    },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      permissions: true,
    },
  })

  if (!row) {
    notFound()
  }

  const role = row.role as ServidorRolePermissoes
  const permissions = parsePermissionsJson(row.permissions)
  const modulosAtivos = await getModulosAtivos()

  const modulos: ModuloPermissoesGrupo[] = []

  for (const modulo of modulosAtivos) {
    if (!isModuloComCatalogo(modulo.chave)) {
      continue
    }

    const catalogo = filtrarCatalogoPorPapel(
      getCatalogoPermissoesModulo(modulo.chave),
      role
    )

    if (catalogo.length === 0) {
      continue
    }

    const valoresModulo = filtrarPermissoesModulo(permissions, modulo.chave)
    const valores: Record<string, boolean> = {}

    for (const item of catalogo) {
      valores[item.key] = valoresModulo[item.key] === true
    }

    modulos.push({
      moduloChave: modulo.chave,
      moduloLabel: modulo.label,
      catalogo,
      valores,
    })
  }

  return {
    servidor: {
      id: row.id,
      name: row.name,
      role,
      active: row.active,
      permissions,
    },
    modulos,
  }
}
