import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { AlertaPendente30Dias } from '../types/tfd.types'
import {
  buildAlertasPendenteComplemento,
  DIAS_ALERTA_PENDENTE_30,
  mapComplementoMaisRecentePorProcesso,
} from '../utils/pendente-prazo'

export async function getAlertasPendente30Dias(): Promise<AlertaPendente30Dias[]> {
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
      protocolo: true,
      processo_id: true,
      paciente: {
        select: { nome: true },
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
    protocolo: solicitacao.protocolo,
    paciente: { nome: solicitacao.paciente.nome },
  }))

  return buildAlertasPendenteComplemento(
    rows,
    complementoMaisRecentePorProcesso,
    DIAS_ALERTA_PENDENTE_30
  )
}
