import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { AgendamentoProcessoListItem } from '../types/tfd.types'
import { formatHoraConsulta } from '../utils/agendamento-novo'

const MODULO_TFD = 'saude.tfd'

export async function getAgendamentosPorProcesso(
  processoId: string
): Promise<AgendamentoProcessoListItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const processo = await db.processo.findFirst({
    where: {
      id: processoId,
      tenant_id: tenantId,
      modulo: MODULO_TFD,
    },
    select: { id: true },
  })

  if (!processo) {
    return []
  }

  const rows = await db.tfdAgendamento.findMany({
    where: {
      tenant_id: tenantId,
      processo_id: processoId,
    },
    orderBy: [{ sequencia: 'asc' }, { created_at: 'asc' }],
    select: {
      id: true,
      solicitacao_id: true,
      sequencia: true,
      data_consulta: true,
      hora_consulta: true,
      tipo_atendimento: true,
      status: true,
      profissional_nome: true,
      orientacoes: true,
      created_at: true,
      prestador: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          estado: true,
        },
      },
      acompanhante: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    solicitacaoId: row.solicitacao_id,
    sequencia: row.sequencia,
    dataConsulta: row.data_consulta.toISOString().slice(0, 10),
    horaConsulta: formatHoraConsulta(row.hora_consulta),
    tipoAtendimento: row.tipo_atendimento,
    status: row.status,
    prestador: {
      id: row.prestador?.id ?? null,
      nome: row.prestador?.nome ?? null,
      cidade: row.prestador?.cidade ?? null,
      estado: row.prestador?.estado ?? null,
    },
    profissionalNome: row.profissional_nome,
    acompanhante: {
      id: row.acompanhante?.id ?? null,
      nome: row.acompanhante?.nome ?? null,
    },
    orientacoes: row.orientacoes,
    createdAt: row.created_at.toISOString(),
  }))
}
