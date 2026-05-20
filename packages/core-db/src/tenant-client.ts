import { prisma } from './prisma'

// USE SEMPRE ESTA FUNÇÃO — nunca use `prisma` diretamente em código de negócio
export async function getPrismaForTenant(tenantId: string) {
  await prisma.$executeRaw`
    SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)
  `
  return prisma
}
