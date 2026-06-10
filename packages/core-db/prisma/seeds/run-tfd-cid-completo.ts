// BLOCO-CID-COMPLETO
/**
 * Importa apenas o catálogo CID-10 completo (DATASUS 2008) para um tenant.
 *
 * Uso:
 *   cd packages/core-db
 *   npx tsx prisma/seeds/run-tfd-cid-completo.ts
 *
 * Variáveis de ambiente:
 *   DATABASE_URL — conexão do banco alvo (produção ou local)
 *   TFD_CID_TENANT_ID — opcional; padrão: campograndems
 */
import { PrismaClient } from '@prisma/client'

import { seedTfdCidCompleto } from './tfd-cid-completo'

const DEFAULT_TENANT_ID = '18ff1259-d432-40ef-a71f-7e643b93c382'

async function main() {
  const tenantId = process.env.TFD_CID_TENANT_ID?.trim() || DEFAULT_TENANT_ID
  const prisma = new PrismaClient()

  try {
    const countBefore = await prisma.tfdCid.count({
      where: { tenant_id: tenantId },
    })
    console.log(`CIDs existentes antes da importação (tenant ${tenantId}): ${countBefore}`)

    await seedTfdCidCompleto(prisma, tenantId)

    const countAfter = await prisma.tfdCid.count({
      where: { tenant_id: tenantId },
    })
    console.log(`CIDs existentes após a importação: ${countAfter}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Falha ao importar CIDs:', error)
  process.exit(1)
})
