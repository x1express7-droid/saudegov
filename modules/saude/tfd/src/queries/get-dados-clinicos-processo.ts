import {
  assertModuleActive,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type { TfdProcessoDadosClinicosOutput } from '../types/tfd.types'

const MODULO_TFD = 'saude.tfd'

export async function getDadosClinicosProcesso(
  processoId: string
): Promise<TfdProcessoDadosClinicosOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const podeVerClinicos =
    hasPermission(session, TFD_PERMISSIONS.REGISTRAR_DADOS_CLINICOS) ||
    hasPermission(session, TFD_PERMISSIONS.ANALISAR_LAUDO)

  if (!podeVerClinicos) {
    throw new Error('Sem permissão para visualizar dados clínicos do processo.')
  }

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const processo = await db.processo.findFirst({
    where: {
      id: processoId,
      tenant_id: tenantId,
      modulo: MODULO_TFD,
    },
    select: { id: true },
  })

  if (!processo) {
    return null
  }

  const row = await db.tfdProcessoDadosClinicos.findUnique({
    where: { processo_id: processoId },
    select: {
      processo_id: true,
      subjetivo: true,
      objetivo: true,
      avaliacao: true,
      plano: true,
      motivo_quadro: true,
      observacao: true,
      updated_at: true,
      registrado_por: {
        select: { name: true },
      },
    },
  })

  if (!row) {
    return {
      processoId,
      subjetivo: null,
      objetivo: null,
      avaliacao: null,
      plano: null,
      motivoQuadro: null,
      observacao: null,
      registradoPorNome: null,
      updatedAt: null,
    }
  }

  return {
    processoId: row.processo_id,
    subjetivo: row.subjetivo,
    objetivo: row.objetivo,
    avaliacao: row.avaliacao,
    plano: row.plano,
    motivoQuadro: row.motivo_quadro,
    observacao: row.observacao,
    registradoPorNome: row.registrado_por?.name ?? null,
    updatedAt: row.updated_at.toISOString(),
  }
}
