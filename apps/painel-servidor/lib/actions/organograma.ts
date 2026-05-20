'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import {
  atualizarDepartamentoSchema,
  atualizarSetorSchema,
  criarDepartamentoSchema,
  criarSetorSchema,
  desativarDepartamentoSchema,
  desativarSetorSchema,
} from '@saude/validators'
import { CONFIG_PERMISSIONS } from '../permissions'
import { ensureSecretariaSaudeForTenant } from '../secretaria-saude'

const ORGANOGRAMA_PATH = '/configuracoes/organograma'

function normalizeSigla(sigla?: string): string | undefined {
  if (!sigla || sigla.trim() === '') {
    return undefined
  }
  return sigla.trim()
}

function normalizeEmail(email?: string | null): string | undefined {
  if (!email || email.trim() === '') {
    return undefined
  }
  return email.trim()
}

async function getAdminSession() {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.ORGANOGRAMA)
  return session
}

export async function criarDepartamento(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getAdminSession()

  const parsed = criarDepartamentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)
    const secretaria = await ensureSecretariaSaudeForTenant(tenantId, db)

    if (!secretaria.ativa) {
      return { success: false, error: 'Secretaria Municipal de Saúde está inativa.' }
    }

    const created = await db.departamento.create({
      data: {
        tenant_id: tenantId,
        secretaria_id: secretaria.id,
        nome: data.nome.trim(),
        sigla: normalizeSigla(data.sigla),
        responsavel_id: data.responsavelId ?? null,
        ativo: true,
      },
      select: { id: true, nome: true, secretaria_id: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'departamentos',
      entidadeId: created.id,
      payloadDepois: {
        nome: created.nome,
        secretariaId: created.secretaria_id,
      },
    })

    revalidatePath(ORGANOGRAMA_PATH)
    return { success: true, data: { id: created.id } }
  } catch (error) {
    console.error('[criarDepartamento] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível criar o departamento. Tente novamente.' }
  }
}

export async function atualizarDepartamento(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await getAdminSession()

  const parsed = atualizarDepartamentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id, nome, sigla, responsavelId } = parsed.data
  const tenantId = session.user.tenantId!

  if (nome === undefined && sigla === undefined && responsavelId === undefined) {
    return { success: false, error: 'Informe ao menos um campo para atualizar.' }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.departamento.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, nome: true, sigla: true, ativo: true },
    })

    if (!existing) {
      return { success: false, error: 'Departamento não encontrado.' }
    }

    const updated = await db.departamento.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(nome !== undefined ? { nome: nome.trim() } : {}),
        ...(sigla !== undefined ? { sigla: normalizeSigla(sigla) ?? null } : {}),
        ...(responsavelId !== undefined ? { responsavel_id: responsavelId } : {}),
      },
      select: { id: true, nome: true, ativo: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'departamentos',
      entidadeId: id,
      payloadAntes: { nome: existing.nome, ativo: existing.ativo },
      payloadDepois: { nome: updated.nome, ativo: updated.ativo },
    })

    revalidatePath(ORGANOGRAMA_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarDepartamento] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar o departamento. Tente novamente.',
    }
  }
}

export async function desativarDepartamento(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await getAdminSession()

  const parsed = desativarDepartamentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.departamento.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, nome: true, ativo: true },
    })

    if (!existing) {
      return { success: false, error: 'Departamento não encontrado.' }
    }

    if (!existing.ativo) {
      return { success: false, error: 'Departamento já está inativo.' }
    }

    const setoresAtivos = await db.setor.count({
      where: { tenant_id: tenantId, departamento_id: id, ativo: true },
    })

    if (setoresAtivos > 0) {
      return {
        success: false,
        error: 'Desative todos os setores deste departamento antes de desativá-lo.',
      }
    }

    await db.departamento.update({
      where: { id, tenant_id: tenantId },
      data: { ativo: false },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'departamentos',
      entidadeId: id,
      payloadAntes: { nome: existing.nome, ativo: true },
      payloadDepois: { nome: existing.nome, ativo: false },
    })

    revalidatePath(ORGANOGRAMA_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desativarDepartamento] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível desativar o departamento. Tente novamente.',
    }
  }
}

export async function criarSetor(rawInput: unknown): Promise<ActionResponse<{ id: string }>> {
  const session = await getAdminSession()

  const parsed = criarSetorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const departamento = await db.departamento.findFirst({
      where: { id: data.departamentoId, tenant_id: tenantId, ativo: true },
      select: { id: true },
    })

    if (!departamento) {
      return { success: false, error: 'Departamento não encontrado ou inativo.' }
    }

    const created = await db.setor.create({
      data: {
        tenant_id: tenantId,
        departamento_id: data.departamentoId,
        nome: data.nome.trim(),
        sigla: normalizeSigla(data.sigla),
        email_setor: normalizeEmail(data.emailSetor) ?? null,
        responsavel_id: data.responsavelId ?? null,
        ativo: true,
      },
      select: { id: true, nome: true, departamento_id: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'setores',
      entidadeId: created.id,
      payloadDepois: {
        nome: created.nome,
        departamentoId: created.departamento_id,
      },
    })

    revalidatePath(ORGANOGRAMA_PATH)
    return { success: true, data: { id: created.id } }
  } catch (error) {
    console.error('[criarSetor] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível criar o setor. Tente novamente.' }
  }
}

export async function atualizarSetor(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await getAdminSession()

  const parsed = atualizarSetorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id, nome, sigla, emailSetor, responsavelId } = parsed.data
  const tenantId = session.user.tenantId!

  if (
    nome === undefined &&
    sigla === undefined &&
    emailSetor === undefined &&
    responsavelId === undefined
  ) {
    return { success: false, error: 'Informe ao menos um campo para atualizar.' }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.setor.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, nome: true, sigla: true, email_setor: true, ativo: true },
    })

    if (!existing) {
      return { success: false, error: 'Setor não encontrado.' }
    }

    const updated = await db.setor.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(nome !== undefined ? { nome: nome.trim() } : {}),
        ...(sigla !== undefined ? { sigla: normalizeSigla(sigla) ?? null } : {}),
        ...(emailSetor !== undefined
          ? { email_setor: normalizeEmail(emailSetor) ?? null }
          : {}),
        ...(responsavelId !== undefined ? { responsavel_id: responsavelId } : {}),
      },
      select: { id: true, nome: true, ativo: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'setores',
      entidadeId: id,
      payloadAntes: {
        nome: existing.nome,
        ativo: existing.ativo,
        emailSetor: existing.email_setor,
      },
      payloadDepois: {
        nome: updated.nome,
        ativo: updated.ativo,
      },
    })

    revalidatePath(ORGANOGRAMA_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarSetor] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível atualizar o setor. Tente novamente.' }
  }
}

export async function desativarSetor(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await getAdminSession()

  const parsed = desativarSetorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.setor.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, nome: true, ativo: true },
    })

    if (!existing) {
      return { success: false, error: 'Setor não encontrado.' }
    }

    if (!existing.ativo) {
      return { success: false, error: 'Setor já está inativo.' }
    }

    await db.setor.update({
      where: { id, tenant_id: tenantId },
      data: { ativo: false },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'setores',
      entidadeId: id,
      payloadAntes: { nome: existing.nome, ativo: true },
      payloadDepois: { nome: existing.nome, ativo: false },
    })

    revalidatePath(ORGANOGRAMA_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desativarSetor] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível desativar o setor. Tente novamente.' }
  }
}
