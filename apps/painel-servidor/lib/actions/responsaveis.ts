'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import { definirSetorResponsavelModuloSchema } from '@saude/validators'
import { CONFIG_PERMISSIONS } from '../permissions'
import { parseModulosAtivos } from '../utils/modulos-ativos'

const RESPONSAVEIS_PATH = '/configuracoes/responsaveis'

export async function definirSetorResponsavelModulo(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.RESPONSAVEIS)

  const parsed = definirSetorResponsavelModuloSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { modulo, setorId } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { modules: true },
    })

    if (!tenant) {
      return { success: false, error: 'Município não encontrado.' }
    }

    const modulosAtivos = parseModulosAtivos(tenant.modules).map((m) => m.chave)
    if (!modulosAtivos.includes(modulo)) {
      return {
        success: false,
        error: 'Este módulo não está ativo para o município.',
        fieldErrors: { modulo: ['Módulo não contratado ou inativo.'] },
      }
    }

    const setor = await db.setor.findFirst({
      where: { id: setorId, tenant_id: tenantId, ativo: true },
      select: { id: true, nome: true },
    })

    if (!setor) {
      return {
        success: false,
        error: 'Setor não encontrado ou inativo.',
        fieldErrors: { setorId: ['Selecione um setor ativo do organograma.'] },
      }
    }

    const anterior = await db.moduloSetorResponsavel.findFirst({
      where: { tenant_id: tenantId, modulo, ativo: true },
      select: { id: true, setor_id: true },
      orderBy: { created_at: 'desc' },
    })

    await db.$transaction(async (tx) => {
      await tx.moduloSetorResponsavel.updateMany({
        where: {
          tenant_id: tenantId,
          modulo,
          ativo: true,
        },
        data: { ativo: false },
      })

      await tx.moduloSetorResponsavel.upsert({
        where: {
          tenant_id_modulo_setor_id: {
            tenant_id: tenantId,
            modulo,
            setor_id: setorId,
          },
        },
        update: { ativo: true },
        create: {
          tenant_id: tenantId,
          modulo,
          setor_id: setorId,
          ativo: true,
        },
      })
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'modulo_setor_responsavel',
      entidadeId: setorId,
      payloadAntes: anterior
        ? { modulo, setorId: anterior.setor_id, ativo: true }
        : { modulo, setorId: null },
      payloadDepois: { modulo, setorId, setorNome: setor.nome, ativo: true },
    })

    revalidatePath(RESPONSAVEIS_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[definirSetorResponsavelModulo] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível definir o setor responsável. Tente novamente.',
    }
  }
}
