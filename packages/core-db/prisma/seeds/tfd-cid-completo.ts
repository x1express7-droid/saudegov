// BLOCO-CID-COMPLETO
import type { PrismaClient } from '@prisma/client'

import { TFD_CID_COMPLETO_ITEMS } from './tfd-cid-completo-data'

const BATCH_SIZE = 500

export async function seedTfdCidCompleto(prisma: PrismaClient, tenantId: string): Promise<void> {
  const totalItems = TFD_CID_COMPLETO_ITEMS.length
  const countBefore = await prisma.tfdCid.count({
    where: { tenant_id: tenantId },
  })

  for (let offset = 0; offset < TFD_CID_COMPLETO_ITEMS.length; offset += BATCH_SIZE) {
    const batch = TFD_CID_COMPLETO_ITEMS.slice(offset, offset + BATCH_SIZE).map((item) => ({
      tenant_id: tenantId,
      codigo: item.codigo,
      descricao: item.descricao,
      ativo: true,
    }))

    await prisma.tfdCid.createMany({
      data: batch,
      skipDuplicates: true,
    })
  }

  const countAfter = await prisma.tfdCid.count({
    where: { tenant_id: tenantId },
  })

  const imported = countAfter - countBefore
  const skipped = totalItems - imported

  console.log(`Total de CIDs importados: ${imported}`)
  console.log(`Total de CIDs que já existiam (skipped): ${skipped}`)
}
