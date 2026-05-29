import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { PrismaClient } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'

import { TFD_PERMISSIONS } from '../permissions'
import { formatHoraConsulta } from '../utils/agendamento-novo'

export interface SegmentoViagemItem {
  id: string
  sequencia: number
  tipoSegmento: string
  status: string
  origemDescricao: string
  destinoDescricao: string
  dataSaida: string
  horaSaida: string | null
  dataChegada: string | null
  horaChegada: string | null
  kmSaida: number | null
  kmChegada: number | null
  custoEstimado: number | null
  custoReal: number | null
  veiculo: {
    placa: string
    modelo: string
  } | null
  motorista: {
    nome: string
  } | null
  observacoes: string | null
}

const segmentoSelect = {
  id: true,
  sequencia: true,
  tipo_segmento: true,
  status: true,
  origem_descricao: true,
  destino_descricao: true,
  data_saida: true,
  hora_saida: true,
  data_chegada: true,
  hora_chegada: true,
  km_saida: true,
  km_chegada: true,
  custo_estimado: true,
  custo_real: true,
  observacoes: true,
  veiculo: {
    select: {
      placa: true,
      modelo: true,
    },
  },
  motorista: {
    select: {
      user: { select: { name: true } },
    },
  },
} as const

type SegmentoRow = {
  id: string
  sequencia: number
  tipo_segmento: string
  status: string
  origem_descricao: string
  destino_descricao: string
  data_saida: Date
  hora_saida: Date | null
  data_chegada: Date | null
  hora_chegada: Date | null
  km_saida: number | null
  km_chegada: number | null
  custo_estimado: Decimal | null
  custo_real: Decimal | null
  observacoes: string | null
  veiculo: { placa: string; modelo: string } | null
  motorista: { user: { name: string } } | null
}

function decimalToNumber(value: Decimal | null): number | null {
  if (value === null) {
    return null
  }
  return Number(value)
}

function mapSegmentoRow(row: SegmentoRow): SegmentoViagemItem {
  return {
    id: row.id,
    sequencia: row.sequencia,
    tipoSegmento: row.tipo_segmento,
    status: row.status,
    origemDescricao: row.origem_descricao,
    destinoDescricao: row.destino_descricao,
    dataSaida: row.data_saida.toISOString().slice(0, 10),
    horaSaida: formatHoraConsulta(row.hora_saida),
    dataChegada: row.data_chegada ? row.data_chegada.toISOString().slice(0, 10) : null,
    horaChegada: formatHoraConsulta(row.hora_chegada),
    kmSaida: row.km_saida,
    kmChegada: row.km_chegada,
    custoEstimado: decimalToNumber(row.custo_estimado),
    custoReal: decimalToNumber(row.custo_real),
    veiculo: row.veiculo,
    motorista: row.motorista ? { nome: row.motorista.user.name } : null,
    observacoes: row.observacoes,
  }
}

export async function fetchSegmentosViagemForTenant(
  db: PrismaClient,
  tenantId: string,
  viagemId: string
): Promise<SegmentoViagemItem[]> {
  const rows = await db.tfdTransporte.findMany({
    where: {
      tenant_id: tenantId,
      viagem_id: viagemId,
    },
    select: segmentoSelect,
    orderBy: { sequencia: 'asc' },
  })

  return rows.map((row) => mapSegmentoRow(row as SegmentoRow))
}

export async function getSegmentosViagem(viagemId: string): Promise<SegmentoViagemItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.MONITORAR_VIAGEM)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const viagem = await db.tfdViagem.findFirst({
    where: { id: viagemId, tenant_id: tenantId },
    select: { id: true },
  })

  if (!viagem) {
    return []
  }

  return fetchSegmentosViagemForTenant(db, tenantId, viagemId)
}
