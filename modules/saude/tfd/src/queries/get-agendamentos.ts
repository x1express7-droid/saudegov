import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdAgendamentoStatus, TfdViagemStatus } from '@prisma/client'

import type { TfdAgendamentoListItem } from '../types/tfd.types'
import { formatHoraConsulta } from '../utils/agendamento-novo'

const MAX_PER_PAGE = 100
const DEFAULT_PER_PAGE = 20

export type AgendamentoListagemFonte = 'legado' | 'novo'

export interface GetAgendamentosFiltros {
  dataInicio?: string
  dataFim?: string
  motoristaId?: string
  veiculoId?: string
  page?: number
  perPage?: number
  /** `legado` = viagens; `novo` = agendamentos; omitido = ambos mesclados por data. */
  fonte?: AgendamentoListagemFonte
}

type ViagemListRow = {
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

type AgendamentoNovoListRow = {
  id: string
  sequencia: number
  data_consulta: Date
  hora_consulta: Date | null
  status: TfdAgendamentoStatus
  solicitacao: {
    id: string
    paciente: { nome: string }
    processo: { protocolo: string }
  }
  transportes: Array<{
    motorista: {
      id: string
      user: { name: string }
    } | null
    veiculo: {
      id: string
      placa: string
      modelo: string
    } | null
  }>
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

function sortKeyDataHora(dataIso: string, hora: string | null): number {
  const parsed = dataIso.length === 10 ? `${dataIso}T12:00:00` : dataIso
  const base = new Date(parsed).getTime()
  if (!hora) {
    return base
  }
  const [h, m] = hora.split(':').map(Number)
  return base + (h ?? 0) * 3_600_000 + (m ?? 0) * 60_000
}

function mapViagemToListItem(row: ViagemListRow): TfdAgendamentoListItem {
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

function mapAgendamentoNovoToListItem(row: AgendamentoNovoListRow): TfdAgendamentoListItem {
  const transporte = row.transportes[0]

  return {
    id: row.id,
    sequencia: row.sequencia,
    dataViagem: row.data_consulta.toISOString().slice(0, 10),
    horaSaida: formatHoraConsulta(row.hora_consulta),
    status: row.status,
    solicitacao: {
      id: row.solicitacao.id,
      protocolo: row.solicitacao.processo.protocolo,
      paciente: { nome: row.solicitacao.paciente.nome },
    },
    motorista: transporte?.motorista
      ? { id: transporte.motorista.id, nome: transporte.motorista.user.name }
      : null,
    veiculo: transporte?.veiculo
      ? {
          id: transporte.veiculo.id,
          placa: transporte.veiculo.placa,
          modelo: transporte.veiculo.modelo,
        }
      : null,
    lembrete48hEnviadoAt: null,
    lembrete48hFalhouAt: null,
  }
}

const viagemListSelect = {
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

const agendamentoNovoListSelect = {
  id: true,
  sequencia: true,
  data_consulta: true,
  hora_consulta: true,
  status: true,
  solicitacao: {
    select: {
      id: true,
      paciente: { select: { nome: true } },
      processo: { select: { protocolo: true } },
    },
  },
  transportes: {
    orderBy: { sequencia: 'asc' as const },
    take: 1,
    select: {
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

  const dataConsultaFilter = dataViagemFilter

  const processoWhere =
    session.user.role === 'SERVIDOR' ? { setor_id: session.user.setorId! } : undefined

  const solicitacaoWhere =
    processoWhere !== undefined ? { processo: processoWhere } : undefined

  const viagemWhere = {
    tenant_id: tenantId,
    ...(filtros.motoristaId ? { motorista_id: filtros.motoristaId } : {}),
    ...(filtros.veiculoId ? { veiculo_id: filtros.veiculoId } : {}),
    ...(dataViagemFilter ? { data_viagem: dataViagemFilter } : {}),
    ...(solicitacaoWhere ? { solicitacao: solicitacaoWhere } : {}),
  }

  const agendamentoWhere = {
    tenant_id: tenantId,
    ...(dataConsultaFilter ? { data_consulta: dataConsultaFilter } : {}),
    ...(solicitacaoWhere ? { solicitacao: solicitacaoWhere } : {}),
    ...(filtros.motoristaId
      ? {
          transportes: {
            some: { motorista_id: filtros.motoristaId },
          },
        }
      : {}),
    ...(filtros.veiculoId
      ? {
          transportes: {
            some: { veiculo_id: filtros.veiculoId },
          },
        }
      : {}),
  }

  const fonte = filtros.fonte

  if (fonte === 'legado') {
    const [rows, total] = await Promise.all([
      db.tfdViagemLegado.findMany({
        where: viagemWhere,
        select: viagemListSelect,
        orderBy: [{ data_viagem: 'asc' }, { sequencia: 'asc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.tfdViagemLegado.count({ where: viagemWhere }),
    ])

    return {
      items: rows.map(mapViagemToListItem),
      total,
    }
  }

  if (fonte === 'novo') {
    const [rows, total] = await Promise.all([
      db.tfdAgendamento.findMany({
        where: agendamentoWhere,
        select: agendamentoNovoListSelect,
        orderBy: [{ data_consulta: 'asc' }, { sequencia: 'asc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.tfdAgendamento.count({ where: agendamentoWhere }),
    ])

    return {
      items: rows.map(mapAgendamentoNovoToListItem),
      total,
    }
  }

  const [viagens, agendamentos, totalViagens, totalAgendamentos] = await Promise.all([
    db.tfdViagemLegado.findMany({
      where: viagemWhere,
      select: viagemListSelect,
      orderBy: [{ data_viagem: 'asc' }, { sequencia: 'asc' }],
    }),
    db.tfdAgendamento.findMany({
      where: agendamentoWhere,
      select: agendamentoNovoListSelect,
      orderBy: [{ data_consulta: 'asc' }, { sequencia: 'asc' }],
    }),
    db.tfdViagemLegado.count({ where: viagemWhere }),
    db.tfdAgendamento.count({ where: agendamentoWhere }),
  ])

  const merged = [
    ...viagens.map(mapViagemToListItem),
    ...agendamentos.map(mapAgendamentoNovoToListItem),
  ].sort((a, b) => {
    const keyA = sortKeyDataHora(a.dataViagem, a.horaSaida)
    const keyB = sortKeyDataHora(b.dataViagem, b.horaSaida)
    if (keyA !== keyB) {
      return keyA - keyB
    }
    return a.sequencia - b.sequencia
  })

  const skip = (page - 1) * perPage

  return {
    items: merged.slice(skip, skip + perPage),
    total: totalViagens + totalAgendamentos,
  }
}
