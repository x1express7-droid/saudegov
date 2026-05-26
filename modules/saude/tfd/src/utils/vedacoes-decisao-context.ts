import type { getPrismaForTenant } from '@saude/core-db'

import { calcDistanciaTfdKm, parseMunicipioOrigemFromSettings } from './calc-distancia-tfd'

type TenantDb = Awaited<ReturnType<typeof getPrismaForTenant>>

export interface VedacoesDecisaoContext {
  possuiProcedimentoPab: boolean
  distanciaKmCalculada: number | null
  origemMunicipioConfigurada: boolean
}

export function parseProcedimentoIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

export async function loadVedacoesDecisaoContext(
  db: TenantDb,
  tenantId: string,
  solicitacaoId: string
): Promise<VedacoesDecisaoContext | null> {
  const solicitacao = await db.tfdSolicitacao.findFirst({
    where: {
      id: solicitacaoId,
      tenant_id: tenantId,
    },
    select: {
      procedimentos: true,
      prestador: {
        select: { cidade: true, estado: true },
      },
      tenant: {
        select: { settings: true },
      },
    },
  })

  if (!solicitacao?.prestador) {
    return null
  }

  const procedimentoIds = parseProcedimentoIds(solicitacao.procedimentos)
  let possuiProcedimentoPab = false

  if (procedimentoIds.length > 0) {
    const pabCount = await db.tfdProcedimento.count({
      where: {
        tenant_id: tenantId,
        id: { in: procedimentoIds },
        eh_pab: true,
      },
    })
    possuiProcedimentoPab = pabCount > 0
  }

  const origem = parseMunicipioOrigemFromSettings(solicitacao.tenant.settings)
  const distanciaKmCalculada = calcDistanciaTfdKm({
    origem,
    destino: {
      cidade: solicitacao.prestador.cidade,
      estado: solicitacao.prestador.estado,
    },
  })

  return {
    possuiProcedimentoPab,
    distanciaKmCalculada,
    origemMunicipioConfigurada: origem !== null,
  }
}

export function resolveDistanciaKmParaDecisao(
  distanciaKmCalculada: number | null,
  distanciaKmInformada: number | undefined
): number | null {
  if (distanciaKmInformada !== undefined) {
    return distanciaKmInformada
  }
  return distanciaKmCalculada
}
