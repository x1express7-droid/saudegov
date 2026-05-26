import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { AlertaPendente60Dias } from '../types/tfd.types'
import {
  buildAlertasPendenteComplemento,
  DIAS_CANCELAMENTO_PENDENTE_COMPLEMENTO,
  mapComplementoMaisRecentePorProcesso,
} from '../utils/pendente-prazo'

export async function getAlertasPendente60Dias(): Promise<AlertaPendente60Dias[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const pendentes = await db.tfdSolicitacao.findMany({
    where: {
      tenant_id: tenantId,
      status: 'PENDENTE',
    },
    select: {
      id: true,
      processo_id: true,
      paciente: {
        select: { nome: true },
      },
      processo: {
        select: { protocolo: true },
      },
    },
  })

  if (pendentes.length === 0) {
    return []
  }

  const processoIds = pendentes.map((item) => item.processo_id)

  const tramitacoes = await db.tramitacao.findMany({
    where: {
      tenant_id: tenantId,
      processo_id: { in: processoIds },
      tipo: 'COMPLEMENTO_SOLICITADO',
    },
    select: {
      processo_id: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  })

  const complementoMaisRecentePorProcesso = mapComplementoMaisRecentePorProcesso(tramitacoes)

  const rows = pendentes.map((solicitacao) => ({
    id: solicitacao.id,
    processo_id: solicitacao.processo_id,
    protocolo: solicitacao.processo.protocolo,
    paciente: { nome: solicitacao.paciente.nome },
  }))

  return buildAlertasPendenteComplemento(
    rows,
    complementoMaisRecentePorProcesso,
    DIAS_CANCELAMENTO_PENDENTE_COMPLEMENTO
  )
}
