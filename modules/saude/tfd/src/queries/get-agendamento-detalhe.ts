import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { AgendamentoDetalheOutput } from '../types/tfd.types'
import { formatHoraConsulta } from '../utils/agendamento-novo'

export async function getAgendamentoDetalhe(
  agendamentoId: string
): Promise<AgendamentoDetalheOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const row = await db.tfdAgendamento.findFirst({
    where: {
      id: agendamentoId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      processo_id: true,
      solicitacao_id: true,
      sequencia: true,
      data_consulta: true,
      hora_consulta: true,
      tipo_atendimento: true,
      status: true,
      profissional_nome: true,
      orientacoes: true,
      created_at: true,
      realizado_at: true,
      cancelado_at: true,
      motivo_cancelamento: true,
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
      cancelado_por: {
        select: {
          id: true,
          name: true,
        },
      },
      prestacao_conta: {
        select: {
          id: true,
          status: true,
          prazo_envio_at: true,
        },
      },
    },
  })

  if (!row) {
    return null
  }

  return {
    id: row.id,
    processoId: row.processo_id,
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
    realizadoAt: row.realizado_at?.toISOString() ?? null,
    canceladoAt: row.cancelado_at?.toISOString() ?? null,
    motivoCancelamento: row.motivo_cancelamento,
    canceladoPor: row.cancelado_por
      ? {
          id: row.cancelado_por.id,
          nome: row.cancelado_por.name,
        }
      : null,
    prestacaoConta: row.prestacao_conta
      ? {
          id: row.prestacao_conta.id,
          status: row.prestacao_conta.status,
          prazoEnvioAt: row.prestacao_conta.prazo_envio_at.toISOString(),
        }
      : null,
  }
}
