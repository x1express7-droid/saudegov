import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdViagemStatusV2 } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'

// REMOVE-PROCESSO-PARTE-4: listagem sem filtro por processo_id
const MAX_PER_PAGE = 100
const DEFAULT_PER_PAGE = 20

export interface GetViagensFiltros {
  status?: TfdViagemStatusV2
  protocolo?: string
  dataSaidaInicio?: string
  dataSaidaFim?: string
  motoristaId?: string
  veiculoId?: string
  page?: number
  perPage?: number
}

export interface ViagemTfdListItem {
  id: string
  protocolo: string
  status: TfdViagemStatusV2
  dataSaida: string
  horaSaida: string | null
  origemDescricao: string
  destinoDescricao: string
  veiculo: { placa: string; modelo: string } | null
  motorista: { nome: string } | null
  totalPassageiros: number
  capacidadeVeiculo: number | null
  createdAt: string
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

export async function getViagensTfd(
  filtros: GetViagensFiltros = {}
): Promise<{ items: ViagemTfdListItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.MONITORAR_VIAGEM)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const page = Math.max(1, filtros.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filtros.perPage ?? DEFAULT_PER_PAGE))
  const skip = (page - 1) * perPage

  const dataSaidaFilter =
    filtros.dataSaidaInicio || filtros.dataSaidaFim
      ? {
          ...(filtros.dataSaidaInicio
            ? { gte: parseDataFiltroUtc(filtros.dataSaidaInicio) }
            : {}),
          ...(filtros.dataSaidaFim ? { lte: parseDataFiltroUtc(filtros.dataSaidaFim) } : {}),
        }
      : undefined

  const protocoloFilter = filtros.protocolo?.trim() || undefined

  const whereClause = {
    tenant_id: tenantId,
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(protocoloFilter
      ? { protocolo: { contains: protocoloFilter, mode: 'insensitive' as const } }
      : {}),
    ...(filtros.motoristaId ? { motorista_id: filtros.motoristaId } : {}),
    ...(filtros.veiculoId ? { veiculo_id: filtros.veiculoId } : {}),
    ...(dataSaidaFilter ? { data_saida: dataSaidaFilter } : {}),
  }

  const [total, rows] = await Promise.all([
    db.tfdViagem.count({ where: whereClause }),
    db.tfdViagem.findMany({
      where: whereClause,
      select: {
        id: true,
        protocolo: true,
        status: true,
        data_saida: true,
        hora_saida: true,
        origem_descricao: true,
        destino_descricao: true,
        created_at: true,
        veiculo: {
          select: {
            placa: true,
            modelo: true,
            capacidade_passageiros: true,
          },
        },
        motorista: {
          select: {
            user: { select: { name: true } },
          },
        },
        _count: { select: { passageiros: true } },
      },
      orderBy: [{ data_saida: 'desc' }, { created_at: 'desc' }],
      skip,
      take: perPage,
    }),
  ])

  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      protocolo: row.protocolo,
      status: row.status,
      dataSaida: row.data_saida.toISOString().slice(0, 10),
      horaSaida: formatHoraSaida(row.hora_saida),
      origemDescricao: row.origem_descricao,
      destinoDescricao: row.destino_descricao,
      veiculo: row.veiculo
        ? { placa: row.veiculo.placa, modelo: row.veiculo.modelo }
        : null,
      motorista: row.motorista ? { nome: row.motorista.user.name } : null,
      totalPassageiros: row._count.passageiros,
      capacidadeVeiculo: row.veiculo?.capacidade_passageiros ?? null,
      createdAt: row.created_at.toISOString(),
    })),
  }
}
