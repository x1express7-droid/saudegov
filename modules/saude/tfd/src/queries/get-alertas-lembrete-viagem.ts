import { assertModuleActive, requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'

import type { AlertaLembreteViagemFalhou } from '../types/tfd.types'

export async function getAlertasLembreteViagemTfd(): Promise<AlertaLembreteViagemFalhou[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdViagem.findMany({
    where: {
      tenant_id: tenantId,
      lembrete_48h_falhou_at: { not: null },
      lembrete_48h_enviado_at: null,
    },
    select: {
      id: true,
      data_viagem: true,
      lembrete_48h_falhou_at: true,
      solicitacao: {
        select: {
          id: true,
          processo: { select: { protocolo: true } },
        },
      },
    },
    orderBy: [{ lembrete_48h_falhou_at: 'asc' }, { data_viagem: 'asc' }],
  })

  return rows.map((row) => ({
    id: row.id,
    dataViagem: row.data_viagem.toISOString().slice(0, 10),
    lembrete48hFalhouAt: row.lembrete_48h_falhou_at!.toISOString(),
    solicitacao: {
      id: row.solicitacao.id,
      protocolo: row.solicitacao.processo.protocolo,
    },
  }))
}
