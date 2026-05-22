import 'server-only'

import { getPrismaAdmin } from '@saude/core-db'

export const EXPORT_RATE_LIMIT_PER_TENANT_HOUR = 3

const ONE_HOUR_MS = 60 * 60 * 1000

export class ExportRateLimitError extends Error {
  readonly code = 'EXPORT_RATE_LIMIT' as const

  constructor() {
    super(
      'Limite de exportações atingido. Máximo de 3 relatórios por hora para este município. Tente novamente mais tarde.'
    )
    this.name = 'ExportRateLimitError'
  }
}

/**
 * Bloqueia se o tenant já registrou 3 ou mais EXPORT na última hora.
 * @see docs/SECURITY.md §4.3
 */
export async function assertTenantExportRateLimit(tenantId: string): Promise<void> {
  const db = getPrismaAdmin()
  const desde = new Date(Date.now() - ONE_HOUR_MS)

  const count = await db.auditLog.count({
    where: {
      tenant_id: tenantId,
      acao: 'EXPORT',
      created_at: { gte: desde },
    },
  })

  if (count >= EXPORT_RATE_LIMIT_PER_TENANT_HOUR) {
    throw new ExportRateLimitError()
  }
}
