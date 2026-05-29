import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { Decimal } from '@prisma/client/runtime/library'

import { formatHoraConsulta } from '../utils/agendamento-novo'

export interface TransporteDetalheOutput {
  id: string
  agendamentoId: string | null
  viagemId: string | null
  sequencia: number
  tipoSegmento: string
  status: string
  origemDescricao: string
  destinoDescricao: string
  dataSaida: string
  horaSaida: string | null
  dataChegada: string | null
  horaChegada: string | null
  custoEstimado: number | null
  custoReal: number | null
  responsavelPagamento: string
  observacoes: string | null
  veiculo: {
    id: string
    placa: string
    modelo: string
  } | null
  motorista: {
    id: string
    nome: string
  } | null
  kmSaida: number | null
  kmChegada: number | null
  anexos: Array<{
    id: string
    tipoAnexo: string
    anexoId: string | null
  }>
  itensDespesa: Array<{
    id: string
    tipo: string
    valor: number
    descricao: string | null
    comprovanteAnexoId: string | null
    responsavelPagamento: string
  }>
}

function decimalToNumber(value: Decimal | null): number | null {
  if (value === null) {
    return null
  }
  return Number(value)
}

export async function getTransporteDetalhe(
  transporteId: string
): Promise<TransporteDetalheOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const row = await db.tfdTransporte.findFirst({
    where: {
      id: transporteId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      agendamento_id: true,
      viagem_id: true,
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
        orderBy: { created_at: 'asc' },
      },
      itens_despesa: {
        select: {
          id: true,
          tipo: true,
          valor: true,
          descricao: true,
          comprovante_anexo_id: true,
          responsavel_pagamento: true,
        },
        orderBy: { created_at: 'asc' },
      },
    },
  })

  if (!row) {
    return null
  }

  return {
    id: row.id,
    agendamentoId: row.agendamento_id,
    viagemId: row.viagem_id,
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
    itensDespesa: row.itens_despesa.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      valor: Number(item.valor),
      descricao: item.descricao,
      comprovanteAnexoId: item.comprovante_anexo_id,
      responsavelPagamento: item.responsavel_pagamento,
    })),
  }
}
