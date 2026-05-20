'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSuperAdmin } from '@saude/core-auth'
import { createAuditLog } from '@saude/core-documents'
import { getPrismaAdmin } from '@saude/core-db'
import type { ActionResponse } from '@saude/validators'

const MODULOS_SAUDE = ['tfd', 'regul', 'visa', 'farma', 'ubs', 'sment', 'vacin'] as const

const alterarModuloSchema = z.object({
  tenantId: z.string().uuid('ID do município inválido.'),
  modulo: z.enum(MODULOS_SAUDE, { errorMap: () => ({ message: 'Módulo inválido.' }) }),
  ativo: z.boolean(),
})

function parseModulesRecord(value: unknown): Record<string, Record<string, boolean>> {
  if (typeof value !== 'object' || value === null) {
    return { saude: {} }
  }

  const raw = value as Record<string, unknown>
  const saudeRaw = raw.saude
  const saude: Record<string, boolean> = {}

  if (typeof saudeRaw === 'object' && saudeRaw !== null) {
    for (const [key, val] of Object.entries(saudeRaw)) {
      if (typeof val === 'boolean') {
        saude[key] = val
      }
    }
  }

  return { saude }
}

export async function alterarModulo(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await requireSuperAdmin()

  const parsed = alterarModuloSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { tenantId, modulo, ativo } = parsed.data

  try {
    const db = getPrismaAdmin()

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, modules: true },
    })

    if (!tenant) {
      return { success: false, error: 'Município não encontrado.' }
    }

    const modules = parseModulesRecord(tenant.modules)
    modules.saude = { ...modules.saude, [modulo]: ativo }

    await db.tenant.update({
      where: { id: tenantId },
      data: { modules },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'MODULO_ALTERADO',
      entidade: 'tenants',
      entidadeId: tenantId,
      payloadDepois: { modulo, ativo },
    })

    revalidatePath(`/municipios/${tenantId}`)
    revalidatePath('/municipios')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[alterarModulo] Erro ao alterar módulo:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })

    return {
      success: false,
      error: 'Não foi possível alterar o módulo. Tente novamente.',
    }
  }
}
