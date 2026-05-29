import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

export interface ViagemNovaPorAgendamentoItem {
  agendamentoId: string
  viagemId: string
  viagemProtocolo: string
}

export async function getViagensNovaPorAgendamentos(
  agendamentoIds: string[]
): Promise<ViagemNovaPorAgendamentoItem[]> {
  if (agendamentoIds.length === 0) {
    return []
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const passageiros = await db.tfdViagemPassageiro.findMany({
    where: {
      tenant_id: tenantId,
      agendamento_id: { in: agendamentoIds },
    },
    select: {
      agendamento_id: true,
      viagem: {
        select: {
          id: true,
          protocolo: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  const vistos = new Set<string>()
  const resultado: ViagemNovaPorAgendamentoItem[] = []

  for (const passageiro of passageiros) {
    if (vistos.has(passageiro.agendamento_id)) {
      continue
    }
    vistos.add(passageiro.agendamento_id)
    resultado.push({
      agendamentoId: passageiro.agendamento_id,
      viagemId: passageiro.viagem.id,
      viagemProtocolo: passageiro.viagem.protocolo,
    })
  }

  return resultado
}
