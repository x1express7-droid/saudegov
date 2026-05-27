import type { Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export type ItemDespesaAgendamentoRow = {
  id: string
  tipo: string
  valor: Prisma.Decimal
  descricao: string | null
  comprovante_anexo_id: string | null
  responsavel_pagamento: string
  transporte_id: string | null
  viagem_id: string | null
  agendamento_id: string | null
  transporte: {
    id: string
    sequencia: number
  } | null
}

const itemDespesaSelect = {
  id: true,
  tipo: true,
  valor: true,
  descricao: true,
  comprovante_anexo_id: true,
  responsavel_pagamento: true,
  transporte_id: true,
  viagem_id: true,
  agendamento_id: true,
  transporte: {
    select: {
      id: true,
      sequencia: true,
    },
  },
} as const

/** Itens de despesa vinculados ao agendamento (transportes, legado 1:1 ou lançamento avulso). */
export async function buscarItensDespesaDoAgendamento(
  db: DbClient,
  tenantId: string,
  agendamentoId: string
): Promise<ItemDespesaAgendamentoRow[]> {
  const transportes = await db.tfdTransporte.findMany({
    where: {
      tenant_id: tenantId,
      agendamento_id: agendamentoId,
    },
    select: { id: true },
  })

  const transporteIds = transportes.map((row) => row.id)

  const orFilters: Prisma.TfdItemDespesaWhereInput[] = [{ agendamento_id: agendamentoId }]

  if (transporteIds.length > 0) {
    orFilters.push({ transporte_id: { in: transporteIds } })
  }

  return db.tfdItemDespesa.findMany({
    where: {
      tenant_id: tenantId,
      OR: orFilters,
    },
    select: itemDespesaSelect,
    orderBy: [{ created_at: 'asc' }],
  })
}
