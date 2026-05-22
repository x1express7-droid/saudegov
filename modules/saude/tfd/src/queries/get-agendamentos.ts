import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdViagemStatus } from '@prisma/client'

import type { TfdAgendamentoListItem } from '../types/tfd.types'

const MAX_PER_PAGE = 100
const DEFAULT_PER_PAGE = 20

export interface GetAgendamentosFiltros {
  dataInicio?: string
  dataFim?: string
  motoristaId?: string
  veiculoId?: string
  page?: number
  perPage?: number
}

type AgendamentoListRow = {
  id: string
  sequencia: number
  data_viagem: Date
  hora_saida: Date | null
  status: TfdViagemStatus
  lembrete_48h_enviado_at: Date | null
  lembrete_48h_falhou_at: Date | null
  solicitacao: {
    id: string
    paciente: { nome: string }
    processo: { protocolo: string }
  }
  motorista: {
    id: string
    user: { name: string }
  } | null
  veiculo: {
    id: string
    placa: string
    modelo: string
  } | null
}

function parseDataFiltroUtc(data: string): Date {
  const [year, month, day] = data.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

function formatHoraSaida(hora: Date | null): string | null {
  if (!hora) {
    return null
  }

  const horas = hora.getUTCHours().toString().padStart(2, '0')
  const minutos = hora.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
}

function mapToListItem(row: AgendamentoListRow): TfdAgendamentoListItem {
  return {
    id: row.id,
    sequencia: row.sequencia,
    dataViagem: row.data_viagem.toISOString().slice(0, 10),
    horaSaida: formatHoraSaida(row.hora_saida),
    status: row.status,
    solicitacao: {
      id: row.solicitacao.id,
      protocolo: row.solicitacao.processo.protocolo,
      paciente: { nome: row.solicitacao.paciente.nome },
    },
    motorista: row.motorista
      ? { id: row.motorista.id, nome: row.motorista.user.name }
      : null,
    veiculo: row.veiculo
      ? {
          id: row.veiculo.id,
          placa: row.veiculo.placa,
          modelo: row.veiculo.modelo,
        }
      : null,
    lembrete48hEnviadoAt: row.lembrete_48h_enviado_at?.toISOString() ?? null,
    lembrete48hFalhouAt: row.lembrete_48h_falhou_at?.toISOString() ?? null,
  }
}

const agendamentoListSelect = {
  id: true,
  sequencia: true,
  data_viagem: true,
  hora_saida: true,
  status: true,
  lembrete_48h_enviado_at: true,
  lembrete_48h_falhou_at: true,
  solicitacao: {
    select: {
      id: true,
      paciente: { select: { nome: true } },
      processo: { select: { protocolo: true } },
    },
  },
  motorista: {
    select: {
      id: true,
      user: { select: { name: true } },
    },
  },
  veiculo: {
    select: {
      id: true,
      placa: true,
      modelo: true,
    },
  },
} as const

export async function getAgendamentosTfd(
  filtros: GetAgendamentosFiltros = {}
): Promise<{ items: TfdAgendamentoListItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const page = Math.max(1, filtros.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filtros.perPage ?? DEFAULT_PER_PAGE))

  if (session.user.role === 'SERVIDOR' && !session.user.setorId) {
    return { items: [], total: 0 }
  }

  const db = await getPrismaForTenant(tenantId)

  const dataViagemFilter =
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
    ...(filtros.motoristaId ? { motorista_id: filtros.motoristaId } : {}),
    ...(filtros.veiculoId ? { veiculo_id: filtros.veiculoId } : {}),
    ...(dataViagemFilter ? { data_viagem: dataViagemFilter } : {}),
    ...(solicitacaoWhere ? { solicitacao: solicitacaoWhere } : {}),
  }

  const [rows, total] = await Promise.all([
    db.tfdViagem.findMany({
      where: whereClause,
      select: agendamentoListSelect,
      orderBy: [{ data_viagem: 'asc' }, { sequencia: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdViagem.count({ where: whereClause }),
  ])

  return {
    items: rows.map(mapToListItem),
    total,
  }
}
