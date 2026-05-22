import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { TfdVeiculoAgendamentoItem } from '../types/tfd.types'
import { verificaCapacidadeVeiculo } from '../utils/viagem'

export async function getVeiculosAgendamentoTfd(
  acompanhanteNecessario: boolean
): Promise<TfdVeiculoAgendamentoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdVeiculo.findMany({
    where: {
      tenant_id: tenantId,
      ativo: true,
    },
    select: {
      id: true,
      placa: true,
      modelo: true,
      capacidade_passageiros: true,
    },
    orderBy: { placa: 'asc' },
  })

  return rows
    .filter((row) =>
      verificaCapacidadeVeiculo(row.capacidade_passageiros, acompanhanteNecessario)
    )
    .map((row) => ({
      id: row.id,
      placa: row.placa,
      modelo: row.modelo,
      capacidadePassageiros: row.capacidade_passageiros,
    }))
}
