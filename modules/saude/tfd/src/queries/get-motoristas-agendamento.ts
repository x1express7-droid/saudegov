import { assertModuleActive, requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'

import type { TfdMotoristaAgendamentoItem } from '../types/tfd.types'
import { isCnhVencida } from '../utils/prazos'

function parseDataViagemUtc(dataViagem: string): Date {
  const [year, month, day] = dataViagem.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

export async function getMotoristasAgendamentoTfd(
  dataViagem: string
): Promise<TfdMotoristaAgendamentoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const dataReferencia = parseDataViagemUtc(dataViagem)
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdMotorista.findMany({
    where: {
      tenant_id: tenantId,
      ativo: true,
    },
    select: {
      id: true,
      cnh: true,
      cnh_categoria: true,
      cnh_validade: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  return rows
    .filter((row) => !isCnhVencida(row.cnh_validade, dataReferencia))
    .map((row) => ({
      id: row.id,
      nome: row.user.name,
      cnhNumero: row.cnh,
      cnhValidade: row.cnh_validade.toISOString().slice(0, 10),
      cnhCategoria: row.cnh_categoria,
    }))
}
