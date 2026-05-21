'use server'

import type { ActionResponse } from '@saude/validators'
import { requireSuperAdmin } from '@saude/core-auth'
import {
  ExtratoSaldoTenantError,
  getExtratoSaldoByTenant,
  type GetExtratoSaldoByTenantResult,
} from '../queries/tfd-saldos'

export async function buscarExtratoSaldoTenant(
  rawInput: unknown
): Promise<ActionResponse<GetExtratoSaldoByTenantResult>> {
  await requireSuperAdmin()

  try {
    const data = await getExtratoSaldoByTenant(rawInput)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ExtratoSaldoTenantError) {
      return { success: false, error: error.message }
    }

    console.error('[buscarExtratoSaldoTenant] Erro ao carregar extrato:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })

    return {
      success: false,
      error: 'Não foi possível carregar o extrato. Tente novamente.',
    }
  }
}
