import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdViagemStatus } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import { exportAgendamentosCsvSchema } from '../validators/exportacao.schema'
import {
  assertListagemExportWithinLimit,
  ListagemExportError,
} from './listagem-export'

export interface AgendamentoExportRow {
  protocolo: string
  dataViagem: string
  horaSaida: string | null
  motoristaNome: string
  veiculoLabel: string
  destino: string
  status: TfdViagemStatus
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

const agendamentoExportSelect = {
  data_viagem: true,
  hora_saida: true,
  status: true,
  solicitacao: {
    select: {
      processo: { select: { protocolo: true } },
      prestador: { select: { cidade: true, estado: true } },
    },
  },
  motorista: {
    select: {
      user: { select: { name: true } },
    },
  },
  veiculo: {
    select: {
      placa: true,
      modelo: true,
    },
  },
} as const

/**
 * Lista agendamentos (viagens) sem paginação — uso exclusivo da exportação CSV.
 */
export async function getAgendamentosCompleto(
  rawFiltros: unknown
): Promise<{ items: AgendamentoExportRow[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const parsed = exportAgendamentosCsvSchema.safeParse(rawFiltros)
  if (!parsed.success) {
    throw new ListagemExportError('Filtros de exportação de agendamentos inválidos.')
  }

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const { dataInicio, dataFim, motoristaId, veiculoId } = parsed.data

  const dataViagemFilter =
    dataInicio || dataFim
      ? {
          ...(dataInicio ? { gte: parseDataFiltroUtc(dataInicio) } : {}),
          ...(dataFim ? { lte: parseDataFiltroUtc(dataFim) } : {}),
        }
      : undefined

  const whereClause = {
    tenant_id: tenantId,
    ...(motoristaId ? { motorista_id: motoristaId } : {}),
    ...(veiculoId ? { veiculo_id: veiculoId } : {}),
    ...(dataViagemFilter ? { data_viagem: dataViagemFilter } : {}),
  }

  const total = await db.tfdViagem.count({ where: whereClause })
  assertListagemExportWithinLimit(total, 'agendamentos')

  const rows = await db.tfdViagem.findMany({
    where: whereClause,
    select: agendamentoExportSelect,
    orderBy: [{ data_viagem: 'asc' }, { sequencia: 'asc' }],
  })

  const items: AgendamentoExportRow[] = rows.map((row) => {
    const prestador = row.solicitacao.prestador
    const destino =
      prestador?.cidade && prestador?.estado
        ? `${prestador.cidade}/${prestador.estado}`
        : prestador?.cidade ?? prestador?.estado ?? '—'

    return {
      protocolo: row.solicitacao.processo.protocolo,
      dataViagem: row.data_viagem.toISOString().slice(0, 10),
      horaSaida: formatHoraSaida(row.hora_saida),
      motoristaNome: row.motorista?.user.name ?? '—',
      veiculoLabel: row.veiculo ? `${row.veiculo.placa} — ${row.veiculo.modelo}` : '—',
      destino,
      status: row.status,
    }
  })

  return { items, total }
}
