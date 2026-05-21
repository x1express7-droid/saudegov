import { Prisma } from '@prisma/client'

/** Cliente Prisma de uma transação interativa (`db.$transaction`). */
export type PrismaTransactionClient = Prisma.TransactionClient

type ProtocoloSequenciaLockedRow = {
  id: string
  ultimo_seq: number
}

async function lockProtocoloSequencia(
  tx: PrismaTransactionClient,
  tenantId: string,
  modulo: string,
  ano: number
): Promise<ProtocoloSequenciaLockedRow[]> {
  return tx.$queryRaw<ProtocoloSequenciaLockedRow[]>(
    Prisma.sql`
      SELECT id, ultimo_seq
      FROM public.protocolo_sequencias
      WHERE tenant_id = ${tenantId}::uuid
        AND modulo = ${modulo}
        AND ano = ${ano}
      FOR UPDATE
    `
  )
}

async function incrementLockedSequencia(
  tx: PrismaTransactionClient,
  row: ProtocoloSequenciaLockedRow
): Promise<number> {
  const sequencia = row.ultimo_seq + 1
  await tx.protocoloSequencia.update({
    where: { id: row.id },
    data: { ultimo_seq: sequencia },
  })
  return sequencia
}

/**
 * Gera protocolo único por tenant/ano/módulo de forma atômica.
 * Deve ser chamada dentro de `db.$transaction` — não abre transação própria.
 *
 * @example gerarProtocolo(tenantId, 'SAUDE', 'TFD', tx) → `2025-SAUDE-TFD-000001`
 */
export async function gerarProtocolo(
  tenantId: string,
  sistema: string,
  sigla: string,
  tx: PrismaTransactionClient
): Promise<string> {
  const modulo = `${sistema}_${sigla}`
  const ano = new Date().getFullYear()

  const locked = await lockProtocoloSequencia(tx, tenantId, modulo, ano)

  let sequencia: number

  if (locked.length === 0) {
    try {
      const created = await tx.protocoloSequencia.create({
        data: {
          tenant_id: tenantId,
          modulo,
          ano,
          ultimo_seq: 1,
        },
      })
      sequencia = created.ultimo_seq
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const retryLocked = await lockProtocoloSequencia(tx, tenantId, modulo, ano)
        if (retryLocked.length === 0) {
          throw error
        }
        sequencia = await incrementLockedSequencia(tx, retryLocked[0]!)
      } else {
        throw error
      }
    }
  } else {
    sequencia = await incrementLockedSequencia(tx, locked[0]!)
  }

  return `${ano}-${sistema}-${sigla}-${sequencia.toString().padStart(6, '0')}`
}
