import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import {
  parseSettingsJson,
  settingsToCadsusFormValues,
  settingsToFormValues,
  type CadsusConfigFormValues,
  type DadosMunicipioFormValues,
} from '../utils/parse-settings'

export interface DadosMunicipioPageData {
  name: string
  slug: string
  valores: DadosMunicipioFormValues
  cadsus: CadsusConfigFormValues
}

export async function getDadosMunicipio(): Promise<DadosMunicipioPageData> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.MUNICIPIO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      slug: true,
      settings: true,
    },
  })

  if (!tenant) {
    throw new Error('Município não encontrado.')
  }

  const settings = parseSettingsJson(tenant.settings)

  return {
    name: tenant.name,
    slug: tenant.slug,
    valores: settingsToFormValues(settings),
    cadsus: settingsToCadsusFormValues(settings),
  }
}
