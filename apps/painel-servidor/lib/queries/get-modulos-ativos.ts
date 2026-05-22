import { requireTenantRole, requirePermission } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { ModuloAtivoItem } from '../types/responsaveis.types'
import { parseModulosAtivos } from '../utils/modulos-ativos'

export async function getModulosAtivos(): Promise<ModuloAtivoItem[]> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.RESPONSAVEIS)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { modules: true },
  })

  if (!tenant) {
    throw new Error('Município não encontrado.')
  }

  return parseModulosAtivos(tenant.modules)
}
