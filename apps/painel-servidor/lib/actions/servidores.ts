'use server'

import { revalidatePath } from 'next/cache'
import { hashPassword, requireTenantRole, requirePermission } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import {
  atualizarServidorSchema,
  criarServidorSchema,
  desativarServidorSchema,
} from '@saude/validators'
import { CONFIG_PERMISSIONS } from '../permissions'
import { TENANT_STAFF_ROLES } from '../types/servidores.types'
import { generateTempPassword } from '../utils/temp-password'

const SERVIDORES_PATH = '/configuracoes/servidores'

function normalizeMatricula(matricula?: string | null): string | null {
  if (!matricula || matricula.trim() === '') {
    return null
  }
  return matricula.trim()
}

function normalizeCargo(cargo?: string | null): string | null {
  if (!cargo || cargo.trim() === '') {
    return null
  }
  return cargo.trim()
}

async function getAdminSession() {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.SERVIDORES)
  return session
}

function validateAdminRoleAssignment(
  session: Awaited<ReturnType<typeof getAdminSession>>,
  role: string
): { error: string; fieldErrors: Record<string, string[]> } | null {
  if (role === 'ADMIN' && session.user.role !== 'ADMIN') {
    return {
      error: 'Somente administradores podem atribuir o papel Administrador.',
      fieldErrors: { role: ['Somente administradores podem atribuir este papel.'] },
    }
  }
  return null
}

async function validateSetoresAtivos(
  db: Awaited<ReturnType<typeof getPrismaForTenant>>,
  tenantId: string,
  setorIds: string[]
): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }> {
  const uniqueIds = [...new Set(setorIds)]
  const found = await db.setor.findMany({
    where: {
      tenant_id: tenantId,
      id: { in: uniqueIds },
      ativo: true,
    },
    select: { id: true },
  })

  if (found.length !== uniqueIds.length) {
    return {
      ok: false,
      error: 'Um ou mais setores são inválidos ou estão inativos.',
      fieldErrors: { setorIds: ['Selecione apenas setores ativos do organograma.'] },
    }
  }

  return { ok: true }
}

type TenantDb = Awaited<ReturnType<typeof getPrismaForTenant>>
type ServidorSetorTx = Pick<TenantDb, 'servidorSetor'>

async function syncServidorSetores(
  tx: ServidorSetorTx,
  tenantId: string,
  userId: string,
  setorIds: string[],
  cargo: string | null
): Promise<void> {
  const uniqueIds = [...new Set(setorIds)]

  await tx.servidorSetor.updateMany({
    where: {
      tenant_id: tenantId,
      user_id: userId,
      setor_id: { notIn: uniqueIds },
      ativo: true,
    },
    data: { ativo: false },
  })

  for (let index = 0; index < uniqueIds.length; index++) {
    const setorId = uniqueIds[index]!
    await tx.servidorSetor.upsert({
      where: {
        user_id_setor_id: {
          user_id: userId,
          setor_id: setorId,
        },
      },
      update: {
        tenant_id: tenantId,
        ativo: true,
        principal: index === 0,
        cargo,
      },
      create: {
        tenant_id: tenantId,
        user_id: userId,
        setor_id: setorId,
        principal: index === 0,
        cargo,
        ativo: true,
      },
    })
  }
}

export async function criarServidor(
  rawInput: unknown
): Promise<ActionResponse<{ userId: string; tempPassword: string }>> {
  const session = await getAdminSession()

  const parsed = criarServidorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const tenantId = session.user.tenantId!

  const adminRoleError = validateAdminRoleAssignment(session, data.role)
  if (adminRoleError) {
    return { success: false, ...adminRoleError }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const emailExists = await db.user.findFirst({
      where: { tenant_id: tenantId, email: data.email },
      select: { id: true },
    })
    if (emailExists) {
      return {
        success: false,
        error: 'E-mail já cadastrado neste município.',
        fieldErrors: { email: ['Este e-mail já está em uso.'] },
      }
    }

    const cpfExists = await db.user.findFirst({
      where: { tenant_id: tenantId, cpf: data.cpf },
      select: { id: true },
    })
    if (cpfExists) {
      return {
        success: false,
        error: 'CPF já cadastrado neste município.',
        fieldErrors: { cpf: ['Este CPF já está vinculado a um usuário.'] },
      }
    }

    const setoresCheck = await validateSetoresAtivos(db, tenantId, data.setorIds)
    if (!setoresCheck.ok) {
      return {
        success: false,
        error: setoresCheck.error,
        fieldErrors: setoresCheck.fieldErrors,
      }
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await hashPassword(tempPassword)
    const cargo = normalizeCargo(data.cargo)

    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenant_id: tenantId,
          role: data.role,
          name: data.name.trim(),
          email: data.email,
          cpf: data.cpf,
          matricula: normalizeMatricula(data.matricula),
          password_hash: passwordHash,
          mustChangePassword: true,
          permissions: {},
          active: true,
        },
        select: { id: true, name: true, email: true, role: true },
      })

      await syncServidorSetores(tx, tenantId, user.id, data.setorIds, cargo)

      return user
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'users',
      entidadeId: created.id,
      payloadDepois: {
        name: created.name,
        email: created.email,
        role: created.role,
        setorIds: data.setorIds,
        mustChangePassword: true,
      },
    })

    revalidatePath(SERVIDORES_PATH)
    return {
      success: true,
      data: { userId: created.id, tempPassword },
    }
  } catch (error) {
    console.error('[criarServidor] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível cadastrar o servidor. Tente novamente.',
    }
  }
}

export async function atualizarServidor(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await getAdminSession()

  const parsed = atualizarServidorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const tenantId = session.user.tenantId!

  if (data.role !== undefined) {
    const adminRoleError = validateAdminRoleAssignment(session, data.role)
    if (adminRoleError) {
      return { success: false, ...adminRoleError }
    }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.user.findFirst({
      where: {
        id: data.id,
        tenant_id: tenantId,
        role: { in: [...TENANT_STAFF_ROLES] },
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        matricula: true,
        servidor_setores: {
          where: { tenant_id: tenantId, ativo: true },
          select: { setor_id: true },
        },
      },
    })

    if (!existing) {
      return { success: false, error: 'Servidor não encontrado ou inativo.' }
    }

    if (
      data.id === session.user.id &&
      data.role !== undefined &&
      data.role !== 'ADMIN' &&
      existing.role === 'ADMIN'
    ) {
      return {
        success: false,
        error: 'Você não pode alterar seu próprio papel de administrador.',
        fieldErrors: { role: ['Não é possível rebaixar seu próprio usuário.'] },
      }
    }

    if (data.email && data.email !== existing.email) {
      const emailExists = await db.user.findFirst({
        where: {
          tenant_id: tenantId,
          email: data.email,
          id: { not: data.id },
        },
        select: { id: true },
      })
      if (emailExists) {
        return {
          success: false,
          error: 'E-mail já cadastrado neste município.',
          fieldErrors: { email: ['Este e-mail já está em uso.'] },
        }
      }
    }

    if (data.setorIds) {
      const setoresCheck = await validateSetoresAtivos(db, tenantId, data.setorIds)
      if (!setoresCheck.ok) {
        return {
          success: false,
          error: setoresCheck.error,
          fieldErrors: setoresCheck.fieldErrors,
        }
      }
    }

    const cargo = data.cargo !== undefined ? normalizeCargo(data.cargo) : undefined

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.id },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.matricula !== undefined
            ? { matricula: normalizeMatricula(data.matricula) }
            : {}),
        },
      })

      if (data.setorIds) {
        await syncServidorSetores(
          tx,
          tenantId,
          data.id,
          data.setorIds,
          cargo ?? null
        )
      } else if (cargo !== undefined) {
        await tx.servidorSetor.updateMany({
          where: { tenant_id: tenantId, user_id: data.id, ativo: true },
          data: { cargo },
        })
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'users',
      entidadeId: data.id,
      payloadAntes: {
        name: existing.name,
        email: existing.email,
        role: existing.role,
        matricula: existing.matricula,
        setorIds: existing.servidor_setores.map((s) => s.setor_id),
      },
      payloadDepois: {
        name: data.name ?? existing.name,
        email: data.email ?? existing.email,
        role: data.role ?? existing.role,
        matricula:
          data.matricula !== undefined
            ? normalizeMatricula(data.matricula)
            : existing.matricula,
        setorIds: data.setorIds ?? existing.servidor_setores.map((s) => s.setor_id),
      },
    })

    revalidatePath(SERVIDORES_PATH)
    revalidatePath(`${SERVIDORES_PATH}/${data.id}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarServidor] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar o servidor. Tente novamente.',
    }
  }
}

export async function desativarServidor(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await getAdminSession()

  const parsed = desativarServidorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id } = parsed.data
  const tenantId = session.user.tenantId!

  if (id === session.user.id) {
    return {
      success: false,
      error: 'Você não pode desativar seu próprio usuário.',
    }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.user.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        role: { in: [...TENANT_STAFF_ROLES] },
        active: true,
      },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!existing) {
      return { success: false, error: 'Servidor não encontrado ou já inativo.' }
    }

    await db.user.update({
      where: { id },
      data: { active: false },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'users',
      entidadeId: id,
      payloadAntes: { active: true, name: existing.name, role: existing.role },
      payloadDepois: { active: false },
    })

    revalidatePath(SERVIDORES_PATH)
    revalidatePath(`${SERVIDORES_PATH}/${id}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desativarServidor] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível desativar o servidor. Tente novamente.',
    }
  }
}
