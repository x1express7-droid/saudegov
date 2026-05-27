import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { Decimal } from '@prisma/client/runtime/library'

import type { TransporteAgendamentoItem } from '../types/tfd.types'
import { formatHoraConsulta } from '../utils/agendamento-novo'

export type { TransporteAgendamentoItem } from '../types/tfd.types'

function decimalToNumber(value: Decimal | null): number | null {
  if (value === null) {
    return null
  }
  return Number(value)
}

const transporteSelect = {
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
  custo_estimado: true,
  custo_real: true,
  responsavel_pagamento: true,
  observacoes: true,
  km_saida: true,
  km_chegada: true,
  veiculo: {
    select: {
      id: true,
      placa: true,
      modelo: true,
    },
  },
  motorista: {
    select: {
      id: true,
      user: { select: { name: true } },
    },
  },
  anexos: {
    select: {
      id: true,
      tipo_anexo: true,
      anexo_id: true,
    },
    orderBy: { created_at: 'asc' as const },
  },
} as const

type TransporteRow = {
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
  custo_estimado: Decimal | null
  custo_real: Decimal | null
  responsavel_pagamento: string
  observacoes: string | null
  km_saida: number | null
  km_chegada: number | null
  veiculo: { id: string; placa: string; modelo: string } | null
  motorista: { id: string; user: { name: string } } | null
  anexos: Array<{ id: string; tipo_anexo: string; anexo_id: string | null }>
}

function mapTransporteRow(row: TransporteRow): TransporteAgendamentoItem {
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
    custoEstimado: decimalToNumber(row.custo_estimado),
    custoReal: decimalToNumber(row.custo_real),
    responsavelPagamento: row.responsavel_pagamento,
    observacoes: row.observacoes,
    veiculo: row.veiculo,
    motorista: row.motorista
      ? { id: row.motorista.id, nome: row.motorista.user.name }
      : null,
    kmSaida: row.km_saida,
    kmChegada: row.km_chegada,
    anexos: row.anexos.map((anexo) => ({
      id: anexo.id,
      tipoAnexo: anexo.tipo_anexo,
      anexoId: anexo.anexo_id,
    })),
  }
}

export async function getTransportesPorAgendamento(
  agendamentoId: string
): Promise<TransporteAgendamentoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdTransporte.findMany({
    where: {
      tenant_id: tenantId,
      agendamento_id: agendamentoId,
    },
    select: transporteSelect,
    orderBy: { sequencia: 'asc' },
  })

  return rows.map((row) => mapTransporteRow(row as TransporteRow))
}
