// PC-UPLOAD-FIX
import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

/**
 * Resolve processo_id para upload de comprovante na PC da viagem nova.
 * Equivalente a buscar o primeiro agendamento de passageiro vinculado à viagem.
 */
export async function getProcessoIdParaUploadViagem(viagemId: string): Promise<string | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const passageiro = await db.tfdViagemPassageiro.findFirst({
    where: {
      tenant_id: tenantId,
      viagem_id: viagemId,
    },
    select: {
      agendamento: {
        select: { processo_id: true },
      },
    },
    orderBy: { created_at: 'asc' },
  })

  return passageiro?.agendamento.processo_id ?? null
}
