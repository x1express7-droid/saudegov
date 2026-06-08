import type { PrismaClient } from '@prisma/client'

/** CIDs frequentes em encaminhamentos TFD — catálogo de desenvolvimento. */
export const TFD_CID_SEED_ITEMS = [
  { codigo: 'I10', descricao: 'Hipertensão essencial (primária)' },
  { codigo: 'E11', descricao: 'Diabetes mellitus não-insulino-dependente' },
  { codigo: 'C50', descricao: 'Neoplasia maligna da mama' },
  { codigo: 'J44', descricao: 'Outra doença pulmonar obstrutiva crônica' },
  { codigo: 'N18', descricao: 'Insuficiência renal crônica' },
  { codigo: 'F32', descricao: 'Episódio depressivo' },
  { codigo: 'M54', descricao: 'Dorsalgia' },
  { codigo: 'K80', descricao: 'Colelitíase' },
  { codigo: 'I25', descricao: 'Doença isquêmica crônica do coração' },
  { codigo: 'G40', descricao: 'Epilepsia' },
  { codigo: 'C18', descricao: 'Neoplasia maligna do cólon' },
  { codigo: 'H25', descricao: 'Catarata senil' },
  { codigo: 'M17', descricao: 'Gonartrose (artrose do joelho)' },
  { codigo: 'C61', descricao: 'Neoplasia maligna da próstata' },
  { codigo: 'D50', descricao: 'Anemia por deficiência de ferro' },
] as const

export async function seedTfdCidExemplo(prisma: PrismaClient, tenantId: string): Promise<void> {
  for (const item of TFD_CID_SEED_ITEMS) {
    await prisma.tfdCid.upsert({
      where: {
        tenant_id_codigo: {
          tenant_id: tenantId,
          codigo: item.codigo,
        },
      },
      update: {
        descricao: item.descricao,
        ativo: true,
      },
      create: {
        tenant_id: tenantId,
        codigo: item.codigo,
        descricao: item.descricao,
        ativo: true,
      },
    })
  }
}
