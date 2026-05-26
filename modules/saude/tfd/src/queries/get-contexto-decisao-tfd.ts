import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type { ContextoDecisaoTfd } from '../types/tfd.types'
import { loadVedacoesDecisaoContext } from '../utils/vedacoes-decisao-context'

export async function getContextoDecisaoTfd(
  solicitacaoId: string
): Promise<ContextoDecisaoTfd | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.DECIDIR_SOLICITACAO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const solicitacao = await db.tfdSolicitacao.findFirst({
    where: {
      id: solicitacaoId,
      tenant_id: tenantId,
      status: 'EM_ANALISE',
    },
    select: {
      prestador: {
        select: { cidade: true, estado: true },
      },
    },
  })

  if (!solicitacao?.prestador) {
    return null
  }

  const contexto = await loadVedacoesDecisaoContext(db, tenantId, solicitacaoId)
  if (!contexto) {
    return null
  }

  return {
    possuiProcedimentoPab: contexto.possuiProcedimentoPab,
    distanciaKmCalculada: contexto.distanciaKmCalculada,
    origemMunicipioConfigurada: contexto.origemMunicipioConfigurada,
    prestadorCidade: solicitacao.prestador.cidade,
    prestadorEstado: solicitacao.prestador.estado,
  }
}
