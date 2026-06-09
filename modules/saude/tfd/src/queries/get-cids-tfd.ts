// BLOCO-CID-COMPLETO
import { getPrismaForTenant } from '@saude/core-db'
import { Prisma } from '@prisma/client'

export interface TfdCidBuscaItem {
  id: string
  codigo: string
  descricao: string
}

export async function getCidsTfdBusca(params: {
  tenantId: string
  busca: string
  limite?: number
}): Promise<TfdCidBuscaItem[]> {
  const busca = params.busca.trim()
  const limite = Math.min(Math.max(params.limite ?? 20, 1), 50)

  const db = await getPrismaForTenant(params.tenantId)

  if (!db.tfdCid) {
    throw new Error(
      'Prisma Client desatualizado: execute `npx prisma generate` em packages/core-db e reinicie o servidor.'
    )
  }

  const rows = await db.$queryRaw<TfdCidBuscaItem[]>(
    Prisma.sql`
      SELECT id, codigo, descricao
      FROM saude_tfd.cids
      WHERE tenant_id = ${params.tenantId}::uuid
        AND ativo = true
        AND (
          codigo ILIKE ${`${busca}%`}
          OR descricao ILIKE ${`%${busca}%`}
        )
      ORDER BY
        CASE
          WHEN lower(codigo) = lower(${busca}) THEN 0
          WHEN codigo ILIKE ${`${busca}%`} THEN 1
          ELSE 2
        END,
        codigo ASC
      LIMIT ${limite}
    `
  )

  return rows
}
