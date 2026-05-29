import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type {
  RelatorioMotoristaData,
  RelatorioMotoristaDetalheItem,
  RelatorioMotoristaGrupoItem,
  RelatorioMotoristaInput,
} from '../types/tfd.types'
function parseDataViagemUtc(data: string): Date {
  const [year, month, day] = data.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

function sumDespesasMunicipio(
  itens: Array<{ valor: { toString(): string } | number; responsavel_pagamento: string }>
): number {
  return itens
    .filter((item) => item.responsavel_pagamento === 'MUNICIPIO')
    .reduce((acc, item) => acc + Number(item.valor), 0)
}

/**
 * Viagens por motorista no período com custos de despesa (sem dados clínicos do paciente).
 */
export async function getRelatorioMotoristaTfd(
  input: RelatorioMotoristaInput
): Promise<RelatorioMotoristaData> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const viagens = await db.tfdViagemLegado.findMany({
    where: {
      tenant_id: tenantId,
      motorista_id: { not: null },
      data_viagem: {
        gte: parseDataViagemUtc(input.dataInicio),
        lte: parseDataViagemUtc(input.dataFim),
      },
      ...(input.motoristaId ? { motorista_id: input.motoristaId } : {}),
    },
    select: {
      id: true,
      protocolo: true,
      data_viagem: true,
      status: true,
      motorista_id: true,
      motorista: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
      itens_despesa: {
        select: {
          valor: true,
          responsavel_pagamento: true,
        },
      },
    },
    orderBy: [{ motorista: { user: { name: 'asc' } } }, { data_viagem: 'asc' }],
  })

  const gruposMap = new Map<string, RelatorioMotoristaGrupoItem>()
  const detalhes: RelatorioMotoristaDetalheItem[] = []
  let valorTotalDespesas = 0

  for (const viagem of viagens) {
    if (!viagem.motorista_id || !viagem.motorista) {
      continue
    }

    const valorDespesas = sumDespesasMunicipio(viagem.itens_despesa)
    valorTotalDespesas += valorDespesas

    const motoristaNome = viagem.motorista.user.name
    const dataViagem = viagem.data_viagem.toISOString().slice(0, 10)

    const existente = gruposMap.get(viagem.motorista_id)
    if (existente) {
      existente.totalViagens += 1
      existente.valorDespesas += valorDespesas
    } else {
      gruposMap.set(viagem.motorista_id, {
        motoristaId: viagem.motorista.id,
        motoristaNome,
        totalViagens: 1,
        valorDespesas,
      })
    }

    detalhes.push({
      motoristaNome,
      protocolo: viagem.protocolo,
      dataViagem,
      statusViagem: viagem.status,
      valorDespesas,
    })
  }

  const grupos = [...gruposMap.values()].sort((a, b) =>
    a.motoristaNome.localeCompare(b.motoristaNome, 'pt-BR')
  )

  return {
    dataInicio: input.dataInicio,
    dataFim: input.dataFim,
    grupos,
    detalhes,
    valorTotalDespesas,
  }
}
