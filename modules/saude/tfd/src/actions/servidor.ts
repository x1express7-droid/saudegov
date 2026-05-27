'use server'

import { revalidatePath } from 'next/cache'
import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'

import { atualizarServidorSchema } from '../validators/servidor.schema'

const MSG_USUARIO_NAO_ENCONTRADO = 'Usuário não encontrado.'
const MSG_SEM_PERMISSAO = 'Sem permissão para editar os dados deste servidor.'

class ServidorBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServidorBusinessError'
  }
}

export async function atualizarDadosServidor(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  const parsed = atualizarServidorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  const isSelf = session.user.id === data.userId
  const isAdmin = session.user.role === 'ADMIN'

  if (!isSelf && !isAdmin) {
    return { success: false, error: MSG_SEM_PERMISSAO }
  }

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const usuarioAntes = await db.user.findFirst({
      where: {
        id: data.userId,
        tenant_id: tenantId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        matricula: true,
      },
    })

    if (!usuarioAntes) {
      return { success: false, error: MSG_USUARIO_NAO_ENCONTRADO }
    }

    const telefone = data.telefone?.trim() || null
    const matricula = data.matricula?.trim() || null

    await db.user.update({
      where: { id: data.userId },
      data: {
        name: data.nome.trim(),
        phone: telefone,
        matricula,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'public_user',
      entidadeId: data.userId,
      payloadAntes: {
        name: usuarioAntes.name,
        phone: usuarioAntes.phone,
        matricula: usuarioAntes.matricula,
      },
      payloadDepois: {
        name: data.nome.trim(),
        phone: telefone,
        matricula,
      },
    })

    revalidatePath(`/saude/tfd/servidores/${data.userId}`)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof ServidorBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[atualizarDadosServidor] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar os dados do servidor. Tente novamente.',
    }
  }
}
