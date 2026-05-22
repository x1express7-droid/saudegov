import { requireSuperAdmin } from '@saude/core-auth/server'
import { getPrismaAdmin } from '@saude/core-db'

export interface AuditLogItem {
  id: string
  tenantId: string | null
  userId: string | null
  acao: string
  entidade: string
  entidadeId: string | null
  payloadAntes: unknown | null
  payloadDepois: unknown | null
  createdAt: string
}

export interface GetAuditLogsFiltros {
  tenantId?: string
  entidade?: string
  acao?: string
  page?: number
  perPage?: number
}

export interface GetAuditLogsResult {
  items: AuditLogItem[]
  total: number
  tenantSlugMap: Record<string, string>
}

export async function getAuditLogs(
  filtros: GetAuditLogsFiltros = {}
): Promise<GetAuditLogsResult> {
  await requireSuperAdmin()

  const { page = 1, perPage = 50, tenantId, entidade, acao } = filtros
  const db = getPrismaAdmin()

  const where = {
    ...(tenantId?.trim() ? { tenant_id: tenantId.trim() } : {}),
    ...(entidade?.trim()
      ? { entidade: { contains: entidade.trim(), mode: 'insensitive' as const } }
      : {}),
    ...(acao?.trim() ? { acao: { contains: acao.trim(), mode: 'insensitive' as const } } : {}),
  }

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: {
        id: true,
        tenant_id: true,
        user_id: true,
        acao: true,
        entidade: true,
        entidade_id: true,
        payload_antes: true,
        payload_depois: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.auditLog.count({ where }),
  ])

  const tenantIds = [
    ...new Set(rows.map((row) => row.tenant_id).filter((id): id is string => id !== null)),
  ]

  const tenants =
    tenantIds.length > 0
      ? await db.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, slug: true },
        })
      : []

  const tenantSlugMap: Record<string, string> = {}
  for (const tenant of tenants) {
    tenantSlugMap[tenant.id] = tenant.slug
  }

  const items: AuditLogItem[] = rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    acao: row.acao,
    entidade: row.entidade,
    entidadeId: row.entidade_id,
    payloadAntes: row.payload_antes,
    payloadDepois: row.payload_depois,
    createdAt: row.created_at.toISOString(),
  }))

  return { items, total, tenantSlugMap }
}
