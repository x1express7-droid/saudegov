import { CadsusRnds } from './rnds-client'
import { CadsusStub } from './stub'
import type { CadsusService } from './types'

export type { CadsusResult, CadsusService } from './types'
export { CadsusStub } from './stub'
export { CadsusRnds } from './rnds-client'

function pickNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getCadsusService(tenantSettings: Record<string, unknown>): CadsusService {
  const enabled = tenantSettings.cadsus_enabled === true
  const token = pickNonEmptyString(tenantSettings.cadsus_token)
  const cnes = pickNonEmptyString(tenantSettings.cadsus_cnes)

  if (enabled && token && cnes) {
    return new CadsusRnds(cnes, token)
  }

  return new CadsusStub()
}
