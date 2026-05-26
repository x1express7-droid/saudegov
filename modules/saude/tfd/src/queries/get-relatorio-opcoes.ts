import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type { RelatorioSelectOption } from '../types/tfd.types'

/** Prestadores ativos para filtro de relatório por prestador. */
export async function getPrestadoresRelatorioOpcoesTfd(): Promise<RelatorioSelectOption[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdPrestador.findMany({
    where: { tenant_id: tenantId, ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  return rows.map((row) => ({ id: row.id, nome: row.nome }))
}

/** Motoristas ativos para filtro de relatório por motorista. */
export async function getMotoristasRelatorioOpcoesTfd(): Promise<RelatorioSelectOption[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdMotorista.findMany({
    where: { tenant_id: tenantId, ativo: true },
    select: {
      id: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  return rows.map((row) => ({ id: row.id, nome: row.user.name }))
}
