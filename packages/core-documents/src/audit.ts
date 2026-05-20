import { getPrismaAdmin } from '@saude/core-db'

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'senha',
  'token',
  'cpf',
  'cns',
  'cid',
  'diagnostico',
  'adminTempPassword',
])

export interface CreateAuditLogInput {
  tenantId?: string | null
  userId?: string | null
  acao: string
  entidade: string
  entidadeId?: string | null
  payloadAntes?: Record<string, unknown>
  payloadDepois?: Record<string, unknown>
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (typeof value === 'object') {
    return sanitizePayload(value as Record<string, unknown>)
  }
  return undefined
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue
    }
    sanitized[key] = sanitizeValue(value)
  }

  return sanitized
}

function toInputJson(value: Record<string, unknown>): object {
  return JSON.parse(JSON.stringify(value)) as object
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  const db = getPrismaAdmin()

  await db.auditLog.create({
    data: {
      tenant_id: input.tenantId ?? null,
      user_id: input.userId ?? null,
      acao: input.acao,
      entidade: input.entidade,
      entidade_id: input.entidadeId ?? null,
      payload_antes: input.payloadAntes ? toInputJson(sanitizePayload(input.payloadAntes)) : undefined,
      payload_depois: input.payloadDepois ? toInputJson(sanitizePayload(input.payloadDepois)) : undefined,
    },
  })
}
