// Exporta apenas o client tenant-aware — use sempre getPrismaForTenant em código de negócio
export { getPrismaForTenant } from './tenant-client'
export { getTenantByDomain } from './get-tenant-by-domain'

// prisma bruto exportado apenas para uso interno (seed, migrations)
// NUNCA importe { prisma } em apps/, modules/ ou packages/ externos
export type { PrismaClient } from '@prisma/client'
