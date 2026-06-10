import type { Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export type ItemDespesaViagemNovaRow = {
  id: string
  tipo: string
  valor: Prisma.Decimal
  descricao: string | null
  comprovante_anexo_id: string | null
  responsavel_pagamento: string
  viagem_nova_id: string | null
  agendamento_id: string | null
  transporte_id: string | null
  created_at: Date
}

const itemDespesaSelect = {
  id: true,
  tipo: true,
  valor: true,
  descricao: true,
  comprovante_anexo_id: true,
  responsavel_pagamento: true,
  viagem_nova_id: true,
  agendamento_id: true,
  transporte_id: true,
  created_at: true,
} as const

export async function buscarItensDespesaDaViagemNova(
  db: DbClient,
  tenantId: string,
  viagemNovaId: string
): Promise<ItemDespesaViagemNovaRow[]> {
  return db.tfdItemDespesa.findMany({
    where: {
      tenant_id: tenantId,
      viagem_nova_id: viagemNovaId,
    },
    select: itemDespesaSelect,
    orderBy: [{ created_at: 'asc' }],
  })
}
