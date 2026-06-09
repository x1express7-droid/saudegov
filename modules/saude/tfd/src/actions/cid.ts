// BLOCO-CID-COMPLETO
'use server'

import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import type { ActionResponse } from '@saude/validators'
import { z } from 'zod'

import { TFD_PERMISSIONS } from '../permissions'
import { getCidsTfdBusca } from '../queries/get-cids-tfd'

const buscarCidsTfdSchema = z.object({
  busca: z.string().trim().min(2, 'Digite pelo menos 2 caracteres para buscar.'),
  limite: z.number().int().min(1).max(50).optional(),
})

export type TfdCidBuscaResultItem = {
  codigo: string
  descricao: string
}

export async function buscarCidsTfd(
  rawInput: unknown
): Promise<ActionResponse<TfdCidBuscaResultItem[]>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = buscarCidsTfdSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const tenantId = session.user.tenantId!

  try {
    const rows = await getCidsTfdBusca({
      tenantId,
      busca: parsed.data.busca,
      limite: parsed.data.limite ?? 20,
    })

    return {
      success: true,
      data: rows.map((row) => ({
        codigo: row.codigo,
        descricao: row.descricao,
      })),
    }
  } catch (error) {
    console.error('[buscarCidsTfd] Erro:', error)
    return { success: false, error: 'Não foi possível buscar CIDs.' }
  }
}
