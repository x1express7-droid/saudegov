'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantRole, requirePermission } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import { atualizarPermissoesServidorSchema } from '@saude/validators'
import { CONFIG_PERMISSIONS } from '../permissions'
import { parseModulosAtivos } from '../utils/modulos-ativos'
import {
  chavesPermitidasModulo,
  filtrarPermissoesModulo,
  getCatalogoPermissoesModulo,
  isModuloComCatalogo,
  parsePermissionsJson,
  podeAtribuirPermissao,
  type ServidorRolePermissoes,
} from '../utils/permissoes-catalogo'

function permissoesPath(servidorId: string): string {
  return `/configuracoes/servidores/${servidorId}/permissoes`
}

export async function atualizarPermissoesServidor(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.PERMISSOES)

  const parsed = atualizarPermissoesServidorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { servidorId, moduloChave, permissions } = parsed.data
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
    if (!modulosAtivos.includes(moduloChave)) {
      return {
        success: false,
        error: 'Este módulo não está ativo para o município.',
        fieldErrors: { moduloChave: ['Módulo não contratado ou inativo.'] },
      }
    }

    if (!isModuloComCatalogo(moduloChave)) {
      return {
        success: false,
        error: 'Catálogo de permissões não disponível para este módulo.',
      }
    }

    const target = await db.user.findFirst({
      where: {
        id: servidorId,
        tenant_id: tenantId,
        role: { in: ['GESTOR', 'SERVIDOR'] },
        active: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        permissions: true,
      },
    })

    if (!target) {
      return {
        success: false,
        error: 'Servidor não encontrado, inativo ou não elegível para permissões granulares.',
      }
    }

    const targetRole = target.role as ServidorRolePermissoes
    const chavesModulo = chavesPermitidasModulo(moduloChave)
    const catalogo = getCatalogoPermissoesModulo(moduloChave)
    const atualizacaoModulo: Record<string, boolean> = {}

    for (const [key, value] of Object.entries(permissions)) {
      if (!chavesModulo.has(key)) {
        return {
          success: false,
          error: 'Permissão inválida para este módulo.',
          fieldErrors: { permissions: [`Chave não permitida: ${key}`] },
        }
      }

      const definicao = catalogo.find((item) => item.key === key)
      if (!definicao) {
        return {
          success: false,
          error: 'Permissão inválida para este módulo.',
        }
      }

      if (value === true && !podeAtribuirPermissao(targetRole, definicao.minRole)) {
        return {
          success: false,
          error: `A permissão "${definicao.label}" exige papel mínimo ${definicao.minRole}.`,
          fieldErrors: { permissions: ['Permissão acima do teto do papel do servidor.'] },
        }
      }

      atualizacaoModulo[key] = value
    }

    const existente = parsePermissionsJson(target.permissions)
    const merged: Record<string, boolean> = { ...existente, ...atualizacaoModulo }

    await db.user.update({
      where: { id: servidorId },
      data: { permissions: merged },
    })

    const antesModulo = filtrarPermissoesModulo(existente, moduloChave)
    const depoisModulo = filtrarPermissoesModulo(merged, moduloChave)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'users',
      entidadeId: servidorId,
      payloadAntes: {
        servidorNome: target.name,
        role: target.role,
        modulo: moduloChave,
        permissions: antesModulo,
      },
      payloadDepois: {
        servidorNome: target.name,
        role: target.role,
        modulo: moduloChave,
        permissions: depoisModulo,
      },
    })

    revalidatePath(permissoesPath(servidorId))
    revalidatePath('/configuracoes/servidores')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarPermissoesServidor] Erro:', {
      tenantId,
      servidorId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar as permissões. Tente novamente.',
    }
  }
}
