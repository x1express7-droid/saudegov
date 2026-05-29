import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'

export interface VagasViagemOutput {
  capacidadeTotal: number | null
  vagasOcupadas: number
  vagasDisponiveis: number | null
}

export async function getVagasViagem(viagemId: string): Promise<VagasViagemOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.MONITORAR_VIAGEM)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const viagem = await db.tfdViagem.findFirst({
    where: {
      id: viagemId,
      tenant_id: tenantId,
    },
    select: {
      veiculo: { select: { capacidade_passageiros: true } },
      passageiros: {
        select: { acompanhantes_count: true },
      },
    },
  })

  if (!viagem) {
    return null
  }

  const capacidadeTotal = viagem.veiculo?.capacidade_passageiros ?? null
  const vagasOcupadas = viagem.passageiros.reduce(
    (total, passageiro) => total + 1 + passageiro.acompanhantes_count,
    0
  )

  return {
    capacidadeTotal,
    vagasOcupadas,
    vagasDisponiveis:
      capacidadeTotal === null ? null : Math.max(0, capacidadeTotal - vagasOcupadas),
  }
}
