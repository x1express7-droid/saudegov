import type { getPrismaForTenant } from '@saude/core-db'

type TenantDb = Awaited<ReturnType<typeof getPrismaForTenant>>

export interface CriarNotificacaoInAppInput {
  tenantId: string
  userIds: string[]
  processoId?: string
  titulo: string
  corpo: string
}

/**
 * Grava notificações in-app com status `ENVIADO`.
 * Retorna `true` se ao menos um registro foi criado.
 */
export async function criarNotificacaoInApp(
  db: TenantDb,
  input: CriarNotificacaoInAppInput
): Promise<boolean> {
  if (input.userIds.length === 0) {
    return false
  }

  const enviadoAt = new Date()

  await db.notificacao.createMany({
    data: input.userIds.map((userId) => ({
      tenant_id: input.tenantId,
      user_id: userId,
      processo_id: input.processoId ?? null,
      canal: 'IN_APP' as const,
      status: 'ENVIADO' as const,
      titulo: input.titulo.slice(0, 200),
      corpo: input.corpo,
      enviado_at: enviadoAt,
    })),
  })

  return true
}
