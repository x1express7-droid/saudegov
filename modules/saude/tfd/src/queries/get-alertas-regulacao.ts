import { assertModuleActive, requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'

import type { AlertaPendente30Dias } from '../types/tfd.types'

const MS_POR_DIA = 24 * 60 * 60 * 1000
const DIAS_ALERTA_PENDENTE = 30

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * MS_POR_DIA)
}

export async function getAlertasPendente30Dias(): Promise<AlertaPendente30Dias[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  const tenantId = session.user.tenantId!
  const limite = subtractDays(new Date(), DIAS_ALERTA_PENDENTE)

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

  const complementoMaisRecentePorProcesso = new Map<string, Date>()
  for (const item of tramitacoes) {
    if (!complementoMaisRecentePorProcesso.has(item.processo_id)) {
      complementoMaisRecentePorProcesso.set(item.processo_id, item.created_at)
    }
  }

  const alertas: AlertaPendente30Dias[] = []

  for (const solicitacao of pendentes) {
    const complementoAt = complementoMaisRecentePorProcesso.get(solicitacao.processo_id)
    if (!complementoAt || complementoAt > limite) {
      continue
    }

    alertas.push({
      id: solicitacao.id,
      protocolo: solicitacao.processo.protocolo,
      paciente: { nome: solicitacao.paciente.nome },
      complementoSolicitadoEm: complementoAt.toISOString(),
    })
  }

  alertas.sort(
    (a, b) =>
      new Date(a.complementoSolicitadoEm).getTime() -
      new Date(b.complementoSolicitadoEm).getTime()
  )

  return alertas
}
