import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { TFD_PERMISSIONS } from '../permissions'

const SERVIDOR_ROLES = ['GESTOR', 'SERVIDOR'] as const

export interface TfdServidorMotoristaOption {
  value: string
  label: string
  email: string
}

export async function getServidoresMotoristaOptionsTfd(
  editUserId?: string
): Promise<TfdServidorMotoristaOption[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_FROTA)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const [usuarios, motoristas] = await Promise.all([
    db.user.findMany({
      where: {
        tenant_id: tenantId,
        active: true,
        role: { in: [...SERVIDOR_ROLES] },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    db.tfdMotorista.findMany({
      where: { tenant_id: tenantId },
      select: { user_id: true },
    }),
  ])

  const userIdsJaMotoristas = new Set(
    motoristas
      .map((m) => m.user_id)
      .filter((id) => id !== editUserId)
  )

  return usuarios
    .filter((user) => !userIdsJaMotoristas.has(user.id))
    .map((user) => ({
      value: user.id,
      label: user.name,
      email: user.email,
    }))
}
