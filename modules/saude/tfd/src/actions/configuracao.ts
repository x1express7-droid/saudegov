'use server'

import { revalidatePath } from 'next/cache'
import { assertModuleActive, requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import {
  atualizarEspecialidadeSchema,
  atualizarPrestadorSchema,
  atualizarProcedimentoSchema,
  criarEspecialidadeSchema,
  criarPrestadorSchema,
  criarProcedimentoSchema,
  desativarEspecialidadeSchema,
  desativarPrestadorSchema,
  desativarProcedimentoSchema,
  atualizarVeiculoSchema,
  criarVeiculoSchema,
  desativarVeiculoSchema,
  atualizarMotoristaSchema,
  criarMotoristaSchema,
  desativarMotoristaSchema,
} from '../validators/configuracao.schema'
import { criarSaldoSchema } from '../validators/financeiro.schema'
import { ExtratoSaldoError, getExtratoSaldo } from '../queries/get-extrato'
import type { GetExtratoSaldoResult } from '../queries/get-extrato'
import { TFD_PERMISSIONS } from '../permissions'
import type { PrismaClient } from '@saude/core-db'

const STUB_ERROR = 'Funcionalidade em implementação.'
const ESPECIALIDADES_PATH = '/saude/tfd/configuracoes/especialidades'
const PROCEDIMENTOS_PATH = '/saude/tfd/configuracoes/procedimentos'
const PRESTADORES_PATH = '/saude/tfd/configuracoes/prestadores'
const VEICULOS_PATH = '/saude/tfd/configuracoes/veiculos'
const MOTORISTAS_PATH = '/saude/tfd/configuracoes/motoristas'
const SALDOS_PATH = '/saude/tfd/configuracoes/saldos'

const SERVIDOR_ROLES_MOTORISTA = ['GESTOR', 'SERVIDOR'] as const
const MOTORISTA_DUPLICADO_MSG = 'Servidor já cadastrado como motorista neste município.'

function parseCnhValidade(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

function parseCompetenciaDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

const PLACA_DUPLICADA_MSG = 'Placa já cadastrada para este município.'

function normalizePlacaInput(rawInput: unknown): unknown {
  if (typeof rawInput !== 'object' || rawInput === null || Array.isArray(rawInput)) {
    return rawInput
  }
  const record = rawInput as Record<string, unknown>
  if (typeof record.placa !== 'string') {
    return rawInput
  }
  return {
    ...record,
    placa: record.placa.trim().toUpperCase(),
  }
}

function parseEspecialidadesJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function uniqueEspecialidadeIds(ids: string[]): string[] {
  return [...new Set(ids)]
}

function normalizeTelefone(value?: string | null): string | null {
  if (!value || value.trim() === '') {
    return null
  }
  return value.trim()
}

function normalizeCnes(value?: string | null): string | null {
  if (!value || value.trim() === '') {
    return null
  }
  return value.trim()
}

async function assertEspecialidadesAtivasDoTenant(
  db: PrismaClient,
  tenantId: string,
  especialidadeIds: string[]
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const ids = uniqueEspecialidadeIds(especialidadeIds)

  if (ids.length === 0) {
    return { ok: true, ids }
  }

  const count = await db.tfdEspecialidade.count({
    where: {
      tenant_id: tenantId,
      ativa: true,
      id: { in: ids },
    },
  })

  if (count !== ids.length) {
    return {
      ok: false,
      error: 'Uma ou mais especialidades são inválidas ou estão inativas.',
    }
  }

  return { ok: true, ids }
}

function normalizeCodigoSigtap(value?: string | null): string | null {
  if (!value || value.trim() === '') {
    return null
  }
  return value.trim()
}

async function assertEspecialidadeDoTenant(
  db: PrismaClient,
  tenantId: string,
  especialidadeId: string,
  options?: { exigirAtiva?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const especialidade = await db.tfdEspecialidade.findFirst({
    where: { id: especialidadeId, tenant_id: tenantId },
    select: { id: true, ativa: true },
  })

  if (!especialidade) {
    return { ok: false, error: 'Especialidade não encontrada.' }
  }

  if (options?.exigirAtiva && !especialidade.ativa) {
    return { ok: false, error: 'Especialidade inativa. Selecione outra especialidade.' }
  }

  return { ok: true }
}

async function getEspecialidadesAdminSession() {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, TFD_PERMISSIONS.CONFIGURAR_ESPECIALIDADES)
  return session
}

// --- Especialidades ---

export async function criarEspecialidadeTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getEspecialidadesAdminSession()

  const parsed = criarEspecialidadeSchema.safeParse(rawInput)
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

    const created = await db.tfdEspecialidade.create({
      data: {
        tenant_id: tenantId,
        nome: data.nome.trim(),
        ativa: true,
      },
      select: { id: true, nome: true, ativa: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_especialidades',
      entidadeId: created.id,
      payloadDepois: { nome: created.nome, ativa: created.ativa },
    })

    revalidatePath(ESPECIALIDADES_PATH)
    return { success: true, data: { id: created.id } }
  } catch (error) {
    console.error('[criarEspecialidadeTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível criar a especialidade. Tente novamente.',
    }
  }
}

export async function atualizarEspecialidadeTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getEspecialidadesAdminSession()

  const parsed = atualizarEspecialidadeSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id, nome, ativa } = parsed.data
  const tenantId = session.user.tenantId!

  if (nome === undefined && ativa === undefined) {
    return { success: false, error: 'Informe ao menos um campo para atualizar.' }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.tfdEspecialidade.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, nome: true, ativa: true },
    })

    if (!existing) {
      return { success: false, error: 'Especialidade não encontrada.' }
    }

    const updated = await db.tfdEspecialidade.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(nome !== undefined ? { nome: nome.trim() } : {}),
        ...(ativa !== undefined ? { ativa } : {}),
      },
      select: { id: true, nome: true, ativa: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_especialidades',
      entidadeId: updated.id,
      payloadAntes: { nome: existing.nome, ativa: existing.ativa },
      payloadDepois: { nome: updated.nome, ativa: updated.ativa },
    })

    revalidatePath(ESPECIALIDADES_PATH)
    return { success: true, data: { id: updated.id } }
  } catch (error) {
    console.error('[atualizarEspecialidadeTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar a especialidade. Tente novamente.',
    }
  }
}

export async function desativarEspecialidadeTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await getEspecialidadesAdminSession()

  const parsed = desativarEspecialidadeSchema.safeParse(rawInput)
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

    const existing = await db.tfdEspecialidade.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, nome: true, ativa: true },
    })

    if (!existing) {
      return { success: false, error: 'Especialidade não encontrada.' }
    }

    if (!existing.ativa) {
      return { success: false, error: 'Esta especialidade já está inativa.' }
    }

    await db.tfdEspecialidade.update({
      where: { id, tenant_id: tenantId },
      data: { ativa: false },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_especialidades',
      entidadeId: id,
      payloadAntes: { nome: existing.nome, ativa: true },
      payloadDepois: { nome: existing.nome, ativa: false },
    })

    revalidatePath(ESPECIALIDADES_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desativarEspecialidadeTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível desativar a especialidade. Tente novamente.',
    }
  }
}

// --- Procedimentos ---

async function getProcedimentosAdminSession() {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, TFD_PERMISSIONS.CONFIGURAR_PROCEDIMENTOS)
  return session
}

export async function criarProcedimentoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getProcedimentosAdminSession()

  const parsed = criarProcedimentoSchema.safeParse(rawInput)
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

    const especialidadeCheck = await assertEspecialidadeDoTenant(
      db,
      tenantId,
      data.especialidadeId,
      { exigirAtiva: true }
    )
    if (!especialidadeCheck.ok) {
      return { success: false, error: especialidadeCheck.error }
    }

    const created = await db.tfdProcedimento.create({
      data: {
        tenant_id: tenantId,
        especialidade_id: data.especialidadeId,
        nome: data.nome.trim(),
        codigo_sigtap: normalizeCodigoSigtap(data.codigoSigtap),
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        especialidade_id: true,
        codigo_sigtap: true,
        ativo: true,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_procedimentos',
      entidadeId: created.id,
      payloadDepois: {
        nome: created.nome,
        especialidadeId: created.especialidade_id,
        codigoSigtap: created.codigo_sigtap,
        ativo: created.ativo,
      },
    })

    revalidatePath(PROCEDIMENTOS_PATH)
    return { success: true, data: { id: created.id } }
  } catch (error) {
    console.error('[criarProcedimentoTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível criar o procedimento. Tente novamente.',
    }
  }
}

export async function atualizarProcedimentoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getProcedimentosAdminSession()

  const parsed = atualizarProcedimentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id, especialidadeId, nome, codigoSigtap, ativo } = parsed.data
  const tenantId = session.user.tenantId!

  if (
    nome === undefined &&
    especialidadeId === undefined &&
    codigoSigtap === undefined &&
    ativo === undefined
  ) {
    return { success: false, error: 'Informe ao menos um campo para atualizar.' }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.tfdProcedimento.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        nome: true,
        especialidade_id: true,
        codigo_sigtap: true,
        ativo: true,
      },
    })

    if (!existing) {
      return { success: false, error: 'Procedimento não encontrado.' }
    }

    if (especialidadeId !== undefined) {
      const especialidadeCheck = await assertEspecialidadeDoTenant(
        db,
        tenantId,
        especialidadeId,
        { exigirAtiva: true }
      )
      if (!especialidadeCheck.ok) {
        return { success: false, error: especialidadeCheck.error }
      }
    }

    const updated = await db.tfdProcedimento.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(nome !== undefined ? { nome: nome.trim() } : {}),
        ...(especialidadeId !== undefined ? { especialidade_id: especialidadeId } : {}),
        ...(codigoSigtap !== undefined
          ? { codigo_sigtap: normalizeCodigoSigtap(codigoSigtap) }
          : {}),
        ...(ativo !== undefined ? { ativo } : {}),
      },
      select: {
        id: true,
        nome: true,
        especialidade_id: true,
        codigo_sigtap: true,
        ativo: true,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_procedimentos',
      entidadeId: updated.id,
      payloadAntes: {
        nome: existing.nome,
        especialidadeId: existing.especialidade_id,
        codigoSigtap: existing.codigo_sigtap,
        ativo: existing.ativo,
      },
      payloadDepois: {
        nome: updated.nome,
        especialidadeId: updated.especialidade_id,
        codigoSigtap: updated.codigo_sigtap,
        ativo: updated.ativo,
      },
    })

    revalidatePath(PROCEDIMENTOS_PATH)
    return { success: true, data: { id: updated.id } }
  } catch (error) {
    console.error('[atualizarProcedimentoTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar o procedimento. Tente novamente.',
    }
  }
}

export async function desativarProcedimentoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await getProcedimentosAdminSession()

  const parsed = desativarProcedimentoSchema.safeParse(rawInput)
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

    const existing = await db.tfdProcedimento.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        nome: true,
        especialidade_id: true,
        codigo_sigtap: true,
        ativo: true,
      },
    })

    if (!existing) {
      return { success: false, error: 'Procedimento não encontrado.' }
    }

    if (!existing.ativo) {
      return { success: false, error: 'Este procedimento já está inativo.' }
    }

    await db.tfdProcedimento.update({
      where: { id, tenant_id: tenantId },
      data: { ativo: false },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_procedimentos',
      entidadeId: id,
      payloadAntes: {
        nome: existing.nome,
        especialidadeId: existing.especialidade_id,
        ativo: true,
      },
      payloadDepois: {
        nome: existing.nome,
        especialidadeId: existing.especialidade_id,
        ativo: false,
      },
    })

    revalidatePath(PROCEDIMENTOS_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desativarProcedimentoTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível desativar o procedimento. Tente novamente.',
    }
  }
}

// --- Prestadores ---

async function getPrestadoresAdminSession() {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, TFD_PERMISSIONS.CONFIGURAR_PRESTADORES)
  return session
}

export async function criarPrestadorTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getPrestadoresAdminSession()

  const parsed = criarPrestadorSchema.safeParse(rawInput)
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

    const especialidadesCheck = await assertEspecialidadesAtivasDoTenant(
      db,
      tenantId,
      data.especialidades
    )
    if (!especialidadesCheck.ok) {
      return { success: false, error: especialidadesCheck.error }
    }

    const created = await db.tfdPrestador.create({
      data: {
        tenant_id: tenantId,
        nome: data.nome.trim(),
        cidade: data.cidade.trim(),
        estado: data.estado,
        cnpj: data.cnpj ?? null,
        cnes: normalizeCnes(data.cnes),
        telefone: normalizeTelefone(data.telefone),
        especialidades: especialidadesCheck.ids,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true,
        cnpj: true,
        cnes: true,
        telefone: true,
        especialidades: true,
        ativo: true,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_prestadores',
      entidadeId: created.id,
      payloadDepois: {
        nome: created.nome,
        cidade: created.cidade,
        estado: created.estado,
        cnpj: created.cnpj,
        cnes: created.cnes,
        telefone: created.telefone,
        especialidades: parseEspecialidadesJson(created.especialidades),
        ativo: created.ativo,
      },
    })

    revalidatePath(PRESTADORES_PATH)
    return { success: true, data: { id: created.id } }
  } catch (error) {
    console.error('[criarPrestadorTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível criar o prestador. Tente novamente.',
    }
  }
}

export async function atualizarPrestadorTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getPrestadoresAdminSession()

  const parsed = atualizarPrestadorSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id, nome, cidade, estado, cnpj, cnes, telefone, especialidades, ativo } = parsed.data
  const tenantId = session.user.tenantId!

  if (
    nome === undefined &&
    cidade === undefined &&
    estado === undefined &&
    cnpj === undefined &&
    cnes === undefined &&
    telefone === undefined &&
    especialidades === undefined &&
    ativo === undefined
  ) {
    return { success: false, error: 'Informe ao menos um campo para atualizar.' }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.tfdPrestador.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true,
        cnpj: true,
        cnes: true,
        telefone: true,
        especialidades: true,
        ativo: true,
      },
    })

    if (!existing) {
      return { success: false, error: 'Prestador não encontrado.' }
    }

    let especialidadesGravadas = parseEspecialidadesJson(existing.especialidades)

    if (especialidades !== undefined) {
      const especialidadesCheck = await assertEspecialidadesAtivasDoTenant(
        db,
        tenantId,
        especialidades
      )
      if (!especialidadesCheck.ok) {
        return { success: false, error: especialidadesCheck.error }
      }
      especialidadesGravadas = especialidadesCheck.ids
    }

    const updated = await db.tfdPrestador.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(nome !== undefined ? { nome: nome.trim() } : {}),
        ...(cidade !== undefined ? { cidade: cidade.trim() } : {}),
        ...(estado !== undefined ? { estado } : {}),
        ...(cnpj !== undefined ? { cnpj: cnpj ?? null } : {}),
        ...(cnes !== undefined ? { cnes: normalizeCnes(cnes) } : {}),
        ...(telefone !== undefined ? { telefone: normalizeTelefone(telefone) } : {}),
        ...(especialidades !== undefined ? { especialidades: especialidadesGravadas } : {}),
        ...(ativo !== undefined ? { ativo } : {}),
      },
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true,
        cnpj: true,
        cnes: true,
        telefone: true,
        especialidades: true,
        ativo: true,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestadores',
      entidadeId: updated.id,
      payloadAntes: {
        nome: existing.nome,
        cidade: existing.cidade,
        estado: existing.estado,
        cnpj: existing.cnpj,
        cnes: existing.cnes,
        telefone: existing.telefone,
        especialidades: parseEspecialidadesJson(existing.especialidades),
        ativo: existing.ativo,
      },
      payloadDepois: {
        nome: updated.nome,
        cidade: updated.cidade,
        estado: updated.estado,
        cnpj: updated.cnpj,
        cnes: updated.cnes,
        telefone: updated.telefone,
        especialidades: parseEspecialidadesJson(updated.especialidades),
        ativo: updated.ativo,
      },
    })

    revalidatePath(PRESTADORES_PATH)
    return { success: true, data: { id: updated.id } }
  } catch (error) {
    console.error('[atualizarPrestadorTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar o prestador. Tente novamente.',
    }
  }
}

export async function desativarPrestadorTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await getPrestadoresAdminSession()

  const parsed = desativarPrestadorSchema.safeParse(rawInput)
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

    const existing = await db.tfdPrestador.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, nome: true, ativo: true },
    })

    if (!existing) {
      return { success: false, error: 'Prestador não encontrado.' }
    }

    if (!existing.ativo) {
      return { success: false, error: 'Este prestador já está inativo.' }
    }

    await db.tfdPrestador.update({
      where: { id, tenant_id: tenantId },
      data: { ativo: false },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_prestadores',
      entidadeId: id,
      payloadAntes: { nome: existing.nome, ativo: true },
      payloadDepois: { nome: existing.nome, ativo: false },
    })

    revalidatePath(PRESTADORES_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desativarPrestadorTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível desativar o prestador. Tente novamente.',
    }
  }
}

// --- Veículos ---

async function getVeiculosGestorSession() {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_FROTA)
  return session
}

async function placaJaCadastrada(
  db: PrismaClient,
  tenantId: string,
  placa: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await db.tfdVeiculo.findFirst({
    where: {
      tenant_id: tenantId,
      placa,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(existing)
}

export async function criarVeiculoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getVeiculosGestorSession()

  const parsed = criarVeiculoSchema.safeParse(normalizePlacaInput(rawInput))
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const tenantId = session.user.tenantId!
  const placa = data.placa.trim().toUpperCase()

  try {
    const db = await getPrismaForTenant(tenantId)

    if (await placaJaCadastrada(db, tenantId, placa)) {
      return {
        success: false,
        error: PLACA_DUPLICADA_MSG,
        fieldErrors: { placa: [PLACA_DUPLICADA_MSG] },
      }
    }

    const created = await db.tfdVeiculo.create({
      data: {
        tenant_id: tenantId,
        placa,
        modelo: data.modelo.trim(),
        capacidade_passageiros: data.capacidadePassageiros,
        ativo: true,
      },
      select: {
        id: true,
        placa: true,
        modelo: true,
        capacidade_passageiros: true,
        ativo: true,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_veiculos',
      entidadeId: created.id,
      payloadDepois: {
        placa: created.placa,
        modelo: created.modelo,
        capacidadePassageiros: created.capacidade_passageiros,
        ativo: created.ativo,
      },
    })

    revalidatePath(VEICULOS_PATH)
    return { success: true, data: { id: created.id } }
  } catch (error) {
    console.error('[criarVeiculoTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível cadastrar o veículo. Tente novamente.',
    }
  }
}

export async function atualizarVeiculoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getVeiculosGestorSession()

  const parsed = atualizarVeiculoSchema.safeParse(normalizePlacaInput(rawInput))
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id, placa, modelo, capacidadePassageiros, ativo } = parsed.data
  const tenantId = session.user.tenantId!

  if (
    placa === undefined &&
    modelo === undefined &&
    capacidadePassageiros === undefined &&
    ativo === undefined
  ) {
    return { success: false, error: 'Informe ao menos um campo para atualizar.' }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.tfdVeiculo.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        placa: true,
        modelo: true,
        capacidade_passageiros: true,
        ativo: true,
      },
    })

    if (!existing) {
      return { success: false, error: 'Veículo não encontrado.' }
    }

    const placaNormalizada = placa?.trim().toUpperCase()

    if (placaNormalizada !== undefined && placaNormalizada !== existing.placa) {
      if (await placaJaCadastrada(db, tenantId, placaNormalizada, id)) {
        return {
          success: false,
          error: PLACA_DUPLICADA_MSG,
          fieldErrors: { placa: [PLACA_DUPLICADA_MSG] },
        }
      }
    }

    const updated = await db.tfdVeiculo.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(placaNormalizada !== undefined ? { placa: placaNormalizada } : {}),
        ...(modelo !== undefined ? { modelo: modelo.trim() } : {}),
        ...(capacidadePassageiros !== undefined
          ? { capacidade_passageiros: capacidadePassageiros }
          : {}),
        ...(ativo !== undefined ? { ativo } : {}),
      },
      select: {
        id: true,
        placa: true,
        modelo: true,
        capacidade_passageiros: true,
        ativo: true,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_veiculos',
      entidadeId: updated.id,
      payloadAntes: {
        placa: existing.placa,
        modelo: existing.modelo,
        capacidadePassageiros: existing.capacidade_passageiros,
        ativo: existing.ativo,
      },
      payloadDepois: {
        placa: updated.placa,
        modelo: updated.modelo,
        capacidadePassageiros: updated.capacidade_passageiros,
        ativo: updated.ativo,
      },
    })

    revalidatePath(VEICULOS_PATH)
    return { success: true, data: { id: updated.id } }
  } catch (error) {
    console.error('[atualizarVeiculoTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar o veículo. Tente novamente.',
    }
  }
}

export async function desativarVeiculoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await getVeiculosGestorSession()

  const parsed = desativarVeiculoSchema.safeParse(rawInput)
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

    const existing = await db.tfdVeiculo.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, placa: true, modelo: true, ativo: true },
    })

    if (!existing) {
      return { success: false, error: 'Veículo não encontrado.' }
    }

    if (!existing.ativo) {
      return { success: false, error: 'Este veículo já está inativo.' }
    }

    await db.tfdVeiculo.update({
      where: { id, tenant_id: tenantId },
      data: { ativo: false },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_veiculos',
      entidadeId: id,
      payloadAntes: {
        placa: existing.placa,
        modelo: existing.modelo,
        ativo: true,
      },
      payloadDepois: {
        placa: existing.placa,
        modelo: existing.modelo,
        ativo: false,
      },
    })

    revalidatePath(VEICULOS_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desativarVeiculoTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível desativar o veículo. Tente novamente.',
    }
  }
}

// --- Motoristas ---

async function getMotoristasGestorSession() {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_FROTA)
  return session
}

async function assertServidorDoTenant(
  db: PrismaClient,
  tenantId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await db.user.findFirst({
    where: {
      id: userId,
      tenant_id: tenantId,
      active: true,
      role: { in: [...SERVIDOR_ROLES_MOTORISTA] },
    },
    select: { id: true },
  })

  if (!user) {
    return { ok: false, error: 'Servidor não encontrado ou inativo neste município.' }
  }

  return { ok: true }
}

export async function criarMotoristaTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getMotoristasGestorSession()

  const parsed = criarMotoristaSchema.safeParse(rawInput)
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

    const servidorCheck = await assertServidorDoTenant(db, tenantId, data.userId)
    if (!servidorCheck.ok) {
      return { success: false, error: servidorCheck.error }
    }

    const motoristaExistente = await db.tfdMotorista.findFirst({
      where: { tenant_id: tenantId, user_id: data.userId },
      select: { id: true },
    })

    if (motoristaExistente) {
      return {
        success: false,
        error: MOTORISTA_DUPLICADO_MSG,
        fieldErrors: { userId: [MOTORISTA_DUPLICADO_MSG] },
      }
    }

    const created = await db.tfdMotorista.create({
      data: {
        tenant_id: tenantId,
        user_id: data.userId,
        cnh: data.cnh.trim(),
        cnh_categoria: data.cnhCategoria,
        cnh_validade: parseCnhValidade(data.cnhValidade),
        ativo: true,
      },
      select: {
        id: true,
        user_id: true,
        cnh: true,
        cnh_categoria: true,
        cnh_validade: true,
        ativo: true,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_motoristas',
      entidadeId: created.id,
      payloadDepois: {
        userId: created.user_id,
        cnh: created.cnh,
        cnhCategoria: created.cnh_categoria,
        cnhValidade: created.cnh_validade.toISOString().slice(0, 10),
        ativo: created.ativo,
      },
    })

    revalidatePath(MOTORISTAS_PATH)
    return { success: true, data: { id: created.id } }
  } catch (error) {
    console.error('[criarMotoristaTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível cadastrar o motorista. Tente novamente.',
    }
  }
}

export async function atualizarMotoristaTfd(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await getMotoristasGestorSession()

  const parsed = atualizarMotoristaSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id, cnh, cnhCategoria, cnhValidade, ativo } = parsed.data
  const tenantId = session.user.tenantId!

  if (cnh === undefined && cnhCategoria === undefined && cnhValidade === undefined && ativo === undefined) {
    return { success: false, error: 'Informe ao menos um campo para atualizar.' }
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const existing = await db.tfdMotorista.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        user_id: true,
        cnh: true,
        cnh_categoria: true,
        cnh_validade: true,
        ativo: true,
      },
    })

    if (!existing) {
      return { success: false, error: 'Motorista não encontrado.' }
    }

    const updated = await db.tfdMotorista.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(cnh !== undefined ? { cnh: cnh.trim() } : {}),
        ...(cnhCategoria !== undefined ? { cnh_categoria: cnhCategoria } : {}),
        ...(cnhValidade !== undefined ? { cnh_validade: parseCnhValidade(cnhValidade) } : {}),
        ...(ativo !== undefined ? { ativo } : {}),
      },
      select: {
        id: true,
        user_id: true,
        cnh: true,
        cnh_categoria: true,
        cnh_validade: true,
        ativo: true,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_motoristas',
      entidadeId: updated.id,
      payloadAntes: {
        userId: existing.user_id,
        cnh: existing.cnh,
        cnhCategoria: existing.cnh_categoria,
        cnhValidade: existing.cnh_validade.toISOString().slice(0, 10),
        ativo: existing.ativo,
      },
      payloadDepois: {
        userId: updated.user_id,
        cnh: updated.cnh,
        cnhCategoria: updated.cnh_categoria,
        cnhValidade: updated.cnh_validade.toISOString().slice(0, 10),
        ativo: updated.ativo,
      },
    })

    revalidatePath(MOTORISTAS_PATH)
    return { success: true, data: { id: updated.id } }
  } catch (error) {
    console.error('[atualizarMotoristaTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar o motorista. Tente novamente.',
    }
  }
}

export async function desativarMotoristaTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await getMotoristasGestorSession()

  const parsed = desativarMotoristaSchema.safeParse(rawInput)
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

    const existing = await db.tfdMotorista.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, user_id: true, cnh: true, ativo: true },
    })

    if (!existing) {
      return { success: false, error: 'Motorista não encontrado.' }
    }

    if (!existing.ativo) {
      return { success: false, error: 'Este motorista já está inativo.' }
    }

    await db.tfdMotorista.update({
      where: { id, tenant_id: tenantId },
      data: { ativo: false },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_motoristas',
      entidadeId: id,
      payloadAntes: { userId: existing.user_id, cnh: existing.cnh, ativo: true },
      payloadDepois: { userId: existing.user_id, cnh: existing.cnh, ativo: false },
    })

    revalidatePath(MOTORISTAS_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[desativarMotoristaTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível desativar o motorista. Tente novamente.',
    }
  }
}

// --- Saldos financeiros ---

export async function criarSaldoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ saldoId: string }>> {
  // BLOCO 1: Verificar módulo ativo
  await assertModuleActive('saude', 'tfd')

  // BLOCO 2: Verificar autenticação e papel mínimo
  const session = await requireTenantRole('GESTOR')

  // BLOCO 3: Verificar permissão granular
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  // BLOCO 4: Validar input com Zod
  const parsed = criarSaldoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  const tenantId = session.user.tenantId!

  // BLOCO 5: Lógica de negócio
  try {
    const db = await getPrismaForTenant(tenantId)

    const saldo = await db.$transaction(async (tx) => {
      const created = await tx.tfdSaldo.create({
        data: {
          tenant_id: tenantId,
          descricao: data.descricao,
          fonte: data.fonte,
          valor_total: data.valorTotal,
          competencia_inicio: parseCompetenciaDate(data.competenciaInicio),
          competencia_fim: parseCompetenciaDate(data.competenciaFim),
          ativo: true,
        },
        select: {
          id: true,
          descricao: true,
          fonte: true,
          valor_total: true,
          competencia_inicio: true,
          competencia_fim: true,
        },
      })

      await tx.tfdMovimentacaoSaldo.create({
        data: {
          tenant_id: tenantId,
          saldo_id: created.id,
          tipo: 'CREDITO',
          valor: data.valorTotal,
          descricao: data.descricao,
          usuario_id: session.user.id,
        },
      })

      return created
    })

    // BLOCO 6: Auditoria
    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'SALDO_CADASTRADO',
      entidade: 'saude_tfd_saldos',
      entidadeId: saldo.id,
      payloadDepois: {
        descricao: saldo.descricao,
        fonte: saldo.fonte,
        valorTotal: Number(saldo.valor_total),
        competenciaInicio: saldo.competencia_inicio.toISOString().slice(0, 10),
        competenciaFim: saldo.competencia_fim.toISOString().slice(0, 10),
      },
    })

    // BLOCO 7: Notificações — fora do escopo desta sprint

    // BLOCO 8: Revalidar cache
    revalidatePath(SALDOS_PATH)

    // BLOCO 9: Retorno de sucesso
    return { success: true, data: { saldoId: saldo.id } }
  } catch (error) {
    // BLOCO 10: Tratamento de erro
    console.error('[criarSaldoTfd] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível cadastrar o saldo financeiro. Tente novamente.',
    }
  }
}

/** Encapsula `getExtratoSaldo` para uso em Client Components (Server Action). */
export async function buscarExtratoSaldoTfd(
  rawFiltros: unknown
): Promise<ActionResponse<GetExtratoSaldoResult>> {
  try {
    const data = await getExtratoSaldo(rawFiltros)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ExtratoSaldoError) {
      return { success: false, error: error.message }
    }
    console.error('[buscarExtratoSaldoTfd] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível carregar o extrato. Tente novamente.',
    }
  }
}
