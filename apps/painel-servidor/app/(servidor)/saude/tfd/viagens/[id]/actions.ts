'use server'

import { requireTenantRole } from '@saude/core-auth/server'
import {
  getAgendamentosDisponiveisParaViagem,
  getProcessoIdParaUploadViagem,
} from '@saude/mod-saude-tfd'
import type { AgendamentoDisponivelViagemItem } from '@saude/mod-saude-tfd/client'

// REMOVE-PROCESSO-PARTE-4: busca por data/destino da viagem
export async function buscarAgendamentosDisponiveisViagemDetalheAction(
  viagemId: string,
  dataSaida?: string,
  destinoDescricao?: string
): Promise<AgendamentoDisponivelViagemItem[]> {
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  return getAgendamentosDisponiveisParaViagem(tenantId, {
    dataSaida,
    destinoDescricao,
    viagemId,
  })
}

// PC-UPLOAD-FIX: resolve processo para upload de comprovante na PC da viagem
export async function getProcessoIdParaUploadViagemAction(
  viagemId: string
): Promise<string | null> {
  await requireTenantRole('SERVIDOR')
  return getProcessoIdParaUploadViagem(viagemId)
}
