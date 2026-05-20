// Exporta apenas o client tenant-aware — use sempre getPrismaForTenant em código de negócio
export { getPrismaAdmin } from './admin-client'
export { getPrismaForTenant } from './tenant-client'
export { getTenantByDomain } from './get-tenant-by-domain'
export { findValidPasswordResetByTokenHash } from './find-password-reset-by-token'

// prisma bruto exportado apenas para uso interno (seed, migrations)
// NUNCA importe { prisma } em apps/, modules/ ou packages/ externos
export type { PrismaClient } from '@prisma/client'
