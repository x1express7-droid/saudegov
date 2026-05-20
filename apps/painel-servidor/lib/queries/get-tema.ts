import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { TenantTheme } from '../theme-to-css-vars'
import { parseThemeJson, themeToFormValues, type TemaFormValues } from '../utils/parse-theme'

export interface TemaTenantData {
  theme: TenantTheme
  valores: TemaFormValues
}

export async function getTema(): Promise<TemaTenantData> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.TEMA)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { theme: true },
  })

  if (!tenant) {
    throw new Error('Município não encontrado.')
  }

  const theme = parseThemeJson(tenant.theme)

  return {
    theme,
    valores: themeToFormValues(theme),
  }
}
