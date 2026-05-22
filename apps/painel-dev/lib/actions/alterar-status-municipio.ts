'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSuperAdmin } from '@saude/core-auth/server'
import { createAuditLog } from '@saude/core-documents'
import { getPrismaAdmin } from '@saude/core-db'
import type { ActionResponse } from '@saude/validators'

const alterarStatusMunicipioSchema = z.object({
  tenantId: z.string().uuid('ID do município inválido.'),
  ativo: z.boolean(),
})

export async function alterarStatusMunicipio(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await requireSuperAdmin()

  const parsed = alterarStatusMunicipioSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { tenantId, ativo } = parsed.data

  try {
    const db = getPrismaAdmin()

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    })

    if (!tenant) {
      return { success: false, error: 'Município não encontrado.' }
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: { active: ativo },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: ativo ? 'TENANT_REATIVADO' : 'TENANT_SUSPENSO',
      entidade: 'tenants',
      entidadeId: tenantId,
      payloadDepois: { ativo },
    })

    revalidatePath(`/municipios/${tenantId}`)
    revalidatePath('/municipios')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[alterarStatusMunicipio] Erro ao alterar status:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })

    return {
      success: false,
      error: 'Não foi possível alterar o status do município. Tente novamente.',
    }
  }
}
