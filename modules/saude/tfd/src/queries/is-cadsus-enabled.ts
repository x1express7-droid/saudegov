import { getPrismaForTenant } from '@saude/core-db'

function tenantSettingsFromJson(settings: unknown): Record<string, unknown> {
  if (typeof settings === 'object' && settings !== null && !Array.isArray(settings)) {
    return settings as Record<string, unknown>
  }
  return {}
}

export async function isCadsusEnabledForTenant(tenantId: string): Promise<boolean> {
  const db = await getPrismaForTenant(tenantId)
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })
  const settings = tenant ? tenantSettingsFromJson(tenant.settings) : {}
  return settings.cadsus_enabled === true
}
