import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { formatHoraConsulta } from '../utils/agendamento-novo'

export interface LocalAgendamentoItem {
  id: string
  ordem: number
  prestador: {
    id: string
    nome: string
    cidade: string
    estado: string
  } | null
  procedimento: {
    id: string
    nome: string
  } | null
  horario: string | null
  observacao: string | null
}

export async function getLocaisAgendamento(
  agendamentoId: string
): Promise<LocalAgendamentoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const agendamento = await db.tfdAgendamento.findFirst({
    where: {
      id: agendamentoId,
      tenant_id: tenantId,
    },
    select: { id: true },
  })

  if (!agendamento) {
    return []
  }

  const rows = await db.tfdAgendamentoLocal.findMany({
    where: {
      tenant_id: tenantId,
      agendamento_id: agendamentoId,
    },
    select: {
      id: true,
      ordem: true,
      horario: true,
      observacao: true,
      prestador: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          estado: true,
        },
      },
      procedimento: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
    orderBy: { ordem: 'asc' },
  })

  return rows.map((row) => ({
    id: row.id,
    ordem: row.ordem,
    prestador: row.prestador
      ? {
          id: row.prestador.id,
          nome: row.prestador.nome,
          cidade: row.prestador.cidade,
          estado: row.prestador.estado,
        }
      : null,
    procedimento: row.procedimento
      ? {
          id: row.procedimento.id,
          nome: row.procedimento.nome,
        }
      : null,
    horario: formatHoraConsulta(row.horario),
    observacao: row.observacao,
  }))
}
