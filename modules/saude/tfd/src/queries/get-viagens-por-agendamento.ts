import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { ViagemPorAgendamentoItem } from '../types/tfd.types'

export type { ViagemPorAgendamentoItem }

export async function getViagensPorAgendamento(
  agendamentoId: string
): Promise<ViagemPorAgendamentoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const passageiros = await db.tfdViagemPassageiro.findMany({
    where: {
      tenant_id: tenantId,
      agendamento_id: agendamentoId,
    },
    select: {
      tipo_trecho: true,
      viagem: {
        select: {
          id: true,
          protocolo: true,
          status: true,
          data_saida: true,
          origem_descricao: true,
          destino_descricao: true,
        },
      },
    },
    orderBy: { created_at: 'asc' },
  })

  return passageiros.map((passageiro) => ({
    id: passageiro.viagem.id,
    protocolo: passageiro.viagem.protocolo,
    status: passageiro.viagem.status,
    dataSaida: passageiro.viagem.data_saida.toISOString().slice(0, 10),
    origemDescricao: passageiro.viagem.origem_descricao,
    destinoDescricao: passageiro.viagem.destino_descricao,
    tipoTrecho: passageiro.tipo_trecho,
  }))
}
