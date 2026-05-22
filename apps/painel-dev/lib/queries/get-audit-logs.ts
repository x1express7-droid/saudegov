import { requireSuperAdmin } from '@saude/core-auth/server'
import { getPrismaAdmin } from '@saude/core-db'
import type { Prisma } from '@prisma/client'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Prefixo de `entidade` por módulo (ex.: saude_tfd → saude + tfd). */
const MODULO_ENTIDADE_PREFIX: Record<string, string> = {
  tfd: 'saude_tfd',
}

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
  dataInicio?: string
  dataFim?: string
  userId?: string
  /** Filtra entidades do módulo (ex.: tfd → prefixo saude_tfd). */
  modulo?: string
  /** Filtra entidades do sistema (primeiro segmento de entidade). */
  sistema?: string
  page?: number
  perPage?: number
}

export interface GetAuditLogsResult {
  items: AuditLogItem[]
  total: number
  tenantSlugMap: Record<string, string>
}

/** Extrai sistema e módulo de entidades no padrão `{sistema}_{modulo}_…`. */
export function parseEntidadeSistemaModulo(entidade: string): {
  sistema: string | null
  modulo: string | null
} {
  const normalized = entidade.trim().toLowerCase()
  if (!normalized) {
    return { sistema: null, modulo: null }
  }

  const parts = normalized.split('_').filter(Boolean)
  if (parts.length >= 2) {
    return { sistema: parts[0] ?? null, modulo: parts[1] ?? null }
  }

  return { sistema: parts[0] ?? null, modulo: null }
}

function parseDateStart(isoDate: string): Date | null {
  if (!DATE_ONLY_REGEX.test(isoDate)) {
    return null
  }
  return new Date(`${isoDate}T00:00:00.000Z`)
}

function parseDateEnd(isoDate: string): Date | null {
  if (!DATE_ONLY_REGEX.test(isoDate)) {
    return null
  }
  return new Date(`${isoDate}T23:59:59.999Z`)
}

function buildModuloEntidadeWhere(modulo: string): Prisma.AuditLogWhereInput {
  const key = modulo.trim().toLowerCase()
  const prefix = MODULO_ENTIDADE_PREFIX[key]

  if (prefix) {
    return {
      entidade: {
        startsWith: prefix,
        mode: 'insensitive',
      },
    }
  }

  return {
    OR: [
      { entidade: { contains: `_${key}_`, mode: 'insensitive' } },
      { entidade: { endsWith: `_${key}`, mode: 'insensitive' } },
    ],
  }
}

function buildSistemaEntidadeWhere(sistema: string): Prisma.AuditLogWhereInput {
  const key = sistema.trim().toLowerCase()
  return {
    entidade: {
      startsWith: `${key}_`,
      mode: 'insensitive',
    },
  }
}

function buildAuditLogWhere(filtros: GetAuditLogsFiltros): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = []

  const tenantId = filtros.tenantId?.trim()
  if (tenantId && UUID_REGEX.test(tenantId)) {
    and.push({ tenant_id: tenantId })
  }

  const entidade = filtros.entidade?.trim()
  if (entidade) {
    and.push({
      entidade: { contains: entidade, mode: 'insensitive' },
    })
  }

  const acao = filtros.acao?.trim()
  if (acao) {
    and.push({
      acao: { equals: acao, mode: 'insensitive' },
    })
  }

  const userId = filtros.userId?.trim()
  if (userId && UUID_REGEX.test(userId)) {
    and.push({ user_id: userId })
  }

  const dataInicio = filtros.dataInicio?.trim()
  const dataFim = filtros.dataFim?.trim()
  const inicio = dataInicio ? parseDateStart(dataInicio) : null
  const fim = dataFim ? parseDateEnd(dataFim) : null

  if (inicio || fim) {
    and.push({
      created_at: {
        ...(inicio ? { gte: inicio } : {}),
        ...(fim ? { lte: fim } : {}),
      },
    })
  }

  const sistema = filtros.sistema?.trim()
  if (sistema) {
    and.push(buildSistemaEntidadeWhere(sistema))
  }

  const modulo = filtros.modulo?.trim()
  if (modulo) {
    and.push(buildModuloEntidadeWhere(modulo))
  }

  if (and.length === 0) {
    return {}
  }

  return { AND: and }
}

export async function getAuditLogs(
  filtros: GetAuditLogsFiltros = {}
): Promise<GetAuditLogsResult> {
  await requireSuperAdmin()

  const page = Math.max(1, filtros.page ?? 1)
  const perPage = Math.min(100, Math.max(1, filtros.perPage ?? 50))
  const db = getPrismaAdmin()
  const where = buildAuditLogWhere(filtros)

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
