import { prisma } from './prisma'

export async function findValidPasswordResetByTokenHash(tokenHash: string) {
  return prisma.passwordReset.findFirst({
    where: {
      token_hash: tokenHash,
      used_at: null,
      expires_at: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          tenant_id: true,
          active: true,
          deleted_at: true,
        },
      },
    },
  })
}
