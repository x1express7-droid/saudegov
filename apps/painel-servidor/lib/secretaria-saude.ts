import {
  getPrismaForTenant,
  SECRETARIA_SAUDE_NOME,
  SECRETARIA_SAUDE_SIGLA,
} from '@saude/core-db'

export { SECRETARIA_SAUDE_NOME, SECRETARIA_SAUDE_SIGLA }

type DbClient = Awaited<ReturnType<typeof getPrismaForTenant>>

export async function ensureSecretariaSaudeForTenant(
  tenantId: string,
  db?: DbClient
): Promise<{ id: string; nome: string; sigla: string | null; ativa: boolean }> {
  const client = db ?? (await getPrismaForTenant(tenantId))

  const existing = await client.secretaria.findFirst({
    where: { tenant_id: tenantId },
    select: { id: true, nome: true, sigla: true, ativa: true },
    orderBy: { created_at: 'asc' },
  })

  if (existing) {
    if (!existing.ativa) {
      return client.secretaria.update({
        where: { id: existing.id, tenant_id: tenantId },
        data: { ativa: true, nome: SECRETARIA_SAUDE_NOME, sigla: SECRETARIA_SAUDE_SIGLA },
        select: { id: true, nome: true, sigla: true, ativa: true },
      })
    }
    return existing
  }

  return client.secretaria.create({
    data: {
      tenant_id: tenantId,
      nome: SECRETARIA_SAUDE_NOME,
      sigla: SECRETARIA_SAUDE_SIGLA,
      ativa: true,
    },
    select: { id: true, nome: true, sigla: true, ativa: true },
  })
}
