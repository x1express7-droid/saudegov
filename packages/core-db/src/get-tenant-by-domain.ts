import { prisma } from './prisma'

export async function getTenantByDomain(domain: string) {
  return prisma.tenant.findFirst({
    where: {
      OR: [{ domain }, { domain_custom: domain }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      modules: true,
      theme: true,
      settings: true,
      active: true,
    },
  })
}
