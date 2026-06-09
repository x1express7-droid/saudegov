'use server'

import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { Sexo } from '@prisma/client'
import type { ActionResponse } from '@saude/validators'
import { validarCNS } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import { getPacienteAtendimentoTfd } from '../queries/get-paciente-atendimento'
import type {
  TfdPacienteAtendimentoBuscaItem,
  TfdPacienteAtendimentoDetalhe,
} from '../types/paciente-atendimento.types'
import {
  buscarPacientesAtendimentoSchema,
  getPacienteAtendimentoSchema,
  salvarPacienteAtendimentoSchema,
} from '../validators/paciente-atendimento.schema'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function parseDataNascimento(value: string | undefined): Date | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  const parsed = new Date(`${trimmed}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeOptionalString(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function buildPacienteData(data: {
  nome: string
  cpf: string
  email: string
  telefoneCelular: string
  cns?: string
  dataNascimento?: string
  sexo?: Sexo
  nomeMae?: string
  municipioNascimento?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  telefone?: string
  telefoneAlternativo?: string
}) {
  const cpf = data.cpf.length === 11 ? data.cpf : null
  const cns = data.cns?.length === 15 ? data.cns : null

  return {
    nome: data.nome.trim(),
    cpf,
    email: data.email.trim(),
    telefone_celular: data.telefoneCelular,
    cns,
    data_nascimento: parseDataNascimento(data.dataNascimento),
    sexo: data.sexo ?? 'NAO_INFORMADO',
    nome_mae: normalizeOptionalString(data.nomeMae),
    municipio_nascimento: normalizeOptionalString(data.municipioNascimento),
    cep: data.cep?.length === 8 ? data.cep : null,
    logradouro: normalizeOptionalString(data.logradouro),
    numero: normalizeOptionalString(data.numero),
    complemento: normalizeOptionalString(data.complemento),
    bairro: normalizeOptionalString(data.bairro),
    municipio: normalizeOptionalString(data.municipio),
    uf: data.uf?.length === 2 ? data.uf : null,
    telefone: normalizeOptionalString(data.telefone),
    telefone_alternativo: normalizeOptionalString(data.telefoneAlternativo),
  }
}

export async function buscarPacientesAtendimentoTfd(
  rawInput: unknown
): Promise<ActionResponse<TfdPacienteAtendimentoBuscaItem[]>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = buscarPacientesAtendimentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { termo, modo } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    if (modo === 'nome') {
      const rows = await db.paciente.findMany({
        where: {
          tenant_id: tenantId,
          ativo: true,
          nome: { contains: termo, mode: 'insensitive' },
        },
        orderBy: { nome: 'asc' },
        take: 10,
        select: { id: true, nome: true, cpf: true, cns: true },
      })
      return {
        success: true,
        data: rows.map((row) => ({
          id: row.id,
          nome: row.nome,
          cpf: row.cpf,
          cns: row.cns,
        })),
      }
    }

    if (modo === 'cpf') {
      const cpf = onlyDigits(termo)
      if (cpf.length !== 11) {
        return { success: false, error: 'Informe um CPF com 11 dígitos.' }
      }
      const row = await db.paciente.findFirst({
        where: { tenant_id: tenantId, ativo: true, cpf },
        select: { id: true, nome: true, cpf: true, cns: true },
      })
      return { success: true, data: row ? [row] : [] }
    }

    const cns = onlyDigits(termo)
    if (cns.length !== 15 || !validarCNS(cns)) {
      return { success: false, error: 'Informe um CNS válido com 15 dígitos.' }
    }

    const row = await db.paciente.findFirst({
      where: { tenant_id: tenantId, ativo: true, cns },
      select: { id: true, nome: true, cpf: true, cns: true },
    })
    return { success: true, data: row ? [row] : [] }
  } catch (error) {
    console.error('[buscarPacientesAtendimentoTfd] Erro:', error)
    return { success: false, error: 'Não foi possível buscar pacientes.' }
  }
}

export async function carregarPacienteAtendimentoTfd(
  rawInput: unknown
): Promise<ActionResponse<TfdPacienteAtendimentoDetalhe>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = getPacienteAtendimentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const detalhe = await getPacienteAtendimentoTfd(parsed.data.pacienteId)
  if (!detalhe) {
    return { success: false, error: 'Paciente não encontrado.' }
  }

  return { success: true, data: detalhe }
}

export async function salvarPacienteAtendimentoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ pacienteId: string }>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = salvarPacienteAtendimentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const tenantId = session.user.tenantId!
  const pacientePayload = buildPacienteData({
    nome: data.nome,
    cpf: data.cpf,
    email: data.email,
    telefoneCelular: data.telefoneCelular,
    cns: data.cns,
    dataNascimento: data.dataNascimento || undefined,
    sexo: data.sexo,
    nomeMae: data.nomeMae,
    municipioNascimento: data.municipioNascimento,
    cep: data.cep,
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    municipio: data.municipio,
    uf: data.uf,
    telefone: data.telefone,
    telefoneAlternativo: data.telefoneAlternativo,
  })

  try {
    const db = await getPrismaForTenant(tenantId)

    if (data.pacienteId) {
      const existing = await db.paciente.findFirst({
        where: { id: data.pacienteId, tenant_id: tenantId, ativo: true },
        select: { id: true },
      })
      if (!existing) {
        return { success: false, error: 'Paciente não encontrado.' }
      }

      if (pacientePayload.cpf) {
        const cpfDuplicado = await db.paciente.findFirst({
          where: {
            tenant_id: tenantId,
            cpf: pacientePayload.cpf,
            id: { not: data.pacienteId },
          },
          select: { id: true },
        })
        if (cpfDuplicado) {
          return { success: false, error: 'CPF já cadastrado para outro paciente.' }
        }
      }

      if (pacientePayload.cns) {
        const cnsDuplicado = await db.paciente.findFirst({
          where: {
            tenant_id: tenantId,
            cns: pacientePayload.cns,
            id: { not: data.pacienteId },
          },
          select: { id: true },
        })
        if (cnsDuplicado) {
          return { success: false, error: 'CNS já cadastrado para outro paciente.' }
        }
      }

      await db.paciente.update({
        where: { id: data.pacienteId, tenant_id: tenantId },
        data: pacientePayload,
      })

      await createAuditLog({
        tenantId,
        userId: session.user.id,
        acao: 'UPDATE',
        entidade: 'saude_base_paciente',
        entidadeId: data.pacienteId,
        payloadDepois: { origem: 'atendimento_tfd' },
      })

      return { success: true, data: { pacienteId: data.pacienteId } }
    }

    if (pacientePayload.cpf) {
      const cpfDuplicado = await db.paciente.findFirst({
        where: { tenant_id: tenantId, cpf: pacientePayload.cpf },
        select: { id: true },
      })
      if (cpfDuplicado) {
        return { success: false, error: 'CPF já cadastrado.' }
      }
    }

    if (pacientePayload.cns) {
      const cnsDuplicado = await db.paciente.findFirst({
        where: { tenant_id: tenantId, cns: pacientePayload.cns },
        select: { id: true },
      })
      if (cnsDuplicado) {
        return { success: false, error: 'CNS já cadastrado.' }
      }
    }

    const created = await db.paciente.create({
      data: {
        tenant_id: tenantId,
        ...pacientePayload,
      },
      select: { id: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_base_paciente',
      entidadeId: created.id,
      payloadDepois: { origem: 'atendimento_tfd' },
    })

    return { success: true, data: { pacienteId: created.id } }
  } catch (error) {
    console.error('[salvarPacienteAtendimentoTfd] Erro:', error)
    return { success: false, error: 'Não foi possível salvar os dados do paciente.' }
  }
}
