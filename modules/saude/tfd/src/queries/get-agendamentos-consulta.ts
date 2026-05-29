import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdAgendamentoStatus } from '@prisma/client'

import { formatHoraConsulta } from '../utils/agendamento-novo'

const MAX_PER_PAGE = 100
const DEFAULT_PER_PAGE = 20

export interface GetAgendamentosConsultaFiltros {
  dataInicio?: string
  dataFim?: string
  status?: TfdAgendamentoStatus
  prestadorId?: string
  page?: number
  perPage?: number
}

import type { TfdAgendamentoConsultaListItem } from '../types/tfd.types'

export type { TfdAgendamentoConsultaListItem } from '../types/tfd.types'

function parseDataFiltroUtc(data: string): Date {
  const [year, month, day] = data.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

export async function getAgendamentosConsulta(
  filtros: GetAgendamentosConsultaFiltros = {}
): Promise<{ items: TfdAgendamentoConsultaListItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const page = Math.max(1, filtros.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filtros.perPage ?? DEFAULT_PER_PAGE))

  if (session.user.role === 'SERVIDOR' && !session.user.setorId) {
    return { items: [], total: 0 }
  }

  const db = await getPrismaForTenant(tenantId)

  const dataConsultaFilter =
    filtros.dataInicio || filtros.dataFim
      ? {
          ...(filtros.dataInicio ? { gte: parseDataFiltroUtc(filtros.dataInicio) } : {}),
          ...(filtros.dataFim ? { lte: parseDataFiltroUtc(filtros.dataFim) } : {}),
        }
      : undefined

  const processoWhere =
    session.user.role === 'SERVIDOR' ? { setor_id: session.user.setorId! } : undefined

  const solicitacaoWhere =
    processoWhere !== undefined ? { processo: processoWhere } : undefined

  const whereClause = {
    tenant_id: tenantId,
    ...(filtros.prestadorId ? { prestador_id: filtros.prestadorId } : {}),
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(dataConsultaFilter ? { data_consulta: dataConsultaFilter } : {}),
    ...(solicitacaoWhere ? { solicitacao: solicitacaoWhere } : {}),
  }

  const [rows, total] = await Promise.all([
    db.tfdAgendamento.findMany({
      where: whereClause,
      select: {
        id: true,
        processo_id: true,
        solicitacao_id: true,
        protocolo: true,
        sequencia: true,
        data_consulta: true,
        hora_consulta: true,
        tipo_atendimento: true,
        status: true,
        prestador: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
          },
        },
        solicitacao: {
          select: {
            paciente: { select: { nome: true } },
          },
        },
      },
      orderBy: [{ data_consulta: 'asc' }, { sequencia: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdAgendamento.count({ where: whereClause }),
  ])

  return {
    items: rows.map((row) => ({
      id: row.id,
      processoId: row.processo_id,
      solicitacaoId: row.solicitacao_id,
      sequencia: row.sequencia,
      dataConsulta: row.data_consulta.toISOString().slice(0, 10),
      horaConsulta: formatHoraConsulta(row.hora_consulta),
      tipoAtendimento: row.tipo_atendimento,
      status: row.status,
      protocolo: row.protocolo,
      pacienteNome: row.solicitacao.paciente.nome,
      prestador: {
        id: row.prestador?.id ?? null,
        nome: row.prestador?.nome ?? null,
        cidade: row.prestador?.cidade ?? null,
        estado: row.prestador?.estado ?? null,
      },
    })),
    total,
  }
}
