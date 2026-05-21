import { Prisma, type TramitacaoTipo } from '@prisma/client'

import type { PrismaTransactionClient } from './protocol'

const SENSITIVE_METADATA_KEYS = new Set([
  'password',
  'password_hash',
  'senha',
  'token',
  'cpf',
  'cns',
  'cid',
  'cid_principal',
  'diagnostico',
  'adminTempPassword',
])

export interface RegistrarTramitacaoInput {
  tenantId: string
  processoId: string
  tipo: TramitacaoTipo
  descricao: string
  visivelServidor?: boolean
  usuarioId?: string | null
  metadata?: Record<string, unknown>
}

function sanitizeMetadataValue(value: unknown): unknown {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (value === null) {
    return null
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadataValue)
  }
  if (typeof value === 'object') {
    return sanitizeMetadata(value as Record<string, unknown>)
  }
  return undefined
}

function sanitizeMetadata(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_METADATA_KEYS.has(key)) {
      continue
    }
    sanitized[key] = sanitizeMetadataValue(value)
  }

  return sanitized
}

function toInputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/**
 * Insere registro imutável em `public.tramitacoes`.
 * Deve ser chamada dentro de `db.$transaction` — não abre transação própria.
 */
export async function registrarTramitacao(
  input: RegistrarTramitacaoInput,
  tx: PrismaTransactionClient
): Promise<{ id: string }> {
  const descricao = input.descricao.trim()
  if (!descricao) {
    throw new Error('Descrição da tramitação é obrigatória.')
  }

  const metadata = input.metadata ? sanitizeMetadata(input.metadata) : {}

  const created = await tx.tramitacao.create({
    data: {
      tenant_id: input.tenantId,
      processo_id: input.processoId,
      tipo: input.tipo,
      descricao,
      visivel_servidor: input.visivelServidor ?? true,
      usuario_id: input.usuarioId ?? null,
      metadata: toInputJson(metadata),
    },
  })

  return { id: created.id }
}
