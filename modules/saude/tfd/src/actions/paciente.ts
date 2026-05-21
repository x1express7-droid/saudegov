'use server'

import { assertModuleActive, maskCPF, requirePermission, requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog, getCadsusService } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import { validarCNS } from '@saude/validators'

import {
  buscarPacientePorCnsSchema,
  vincularPacienteExistenteSchema,
  vincularPacienteNovoSchema,
} from '../validators/paciente.schema'
import { TFD_PERMISSIONS } from '../permissions'

type BuscarPacientePorCnsOutput = {
  nome: string
  dataNascimento: string | null
  municipioNascimento: string | null
  sexo: 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO' | null
  jaCadastrado: boolean
  pacienteId: string | null
  cpfMascarado: string | null
}

type VincularPacienteOutput = {
  pacienteId: string
  jaCadastrado: boolean
}

function tenantSettingsFromJson(settings: unknown): Record<string, unknown> {
  if (typeof settings === 'object' && settings !== null && !Array.isArray(settings)) {
    return settings as Record<string, unknown>
  }
  return {}
}

function maskCns(cns: string): string {
  return `${cns.slice(0, 3)}****`
}

async function loadTenantSettings(
  db: Awaited<ReturnType<typeof getPrismaForTenant>>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const tenantData = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })

  return tenantData ? tenantSettingsFromJson(tenantData.settings) : {}
}

function parseDataNascimento(value: string | undefined): Date | null {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function buscarPacientePorCns(
  rawInput: unknown
): Promise<ActionResponse<BuscarPacientePorCnsOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = buscarPacientePorCnsSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const tenantSettings = await loadTenantSettings(db, tenantId)

    const cadsus = getCadsusService(tenantSettings)
    const resultado = await cadsus.buscarPorCns(data.cns)

    if (!resultado.encontrado) {
      return { success: false, error: 'Paciente não encontrado no CADSUS.' }
    }

    const pacienteLocal = await db.paciente.findFirst({
      where: {
        tenant_id: tenantId,
        cns: data.cns,
      },
      select: {
        id: true,
        cpf: true,
      },
    })

    const jaCadastrado = pacienteLocal !== null
    const fonte = tenantSettings.cadsus_enabled === true ? 'RNDS' : 'STUB'

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'READ_SENSITIVE',
      entidade: 'cadsus_consulta',
      payloadDepois: {
        cns: maskCns(data.cns),
        encontrado: resultado.encontrado,
        jaCadastrado,
        fonte,
      },
    })

    return {
      success: true,
      data: {
        nome: resultado.nome ?? '',
        dataNascimento: resultado.dataNascimento ?? null,
        municipioNascimento: resultado.municipioNascimento ?? null,
        sexo: resultado.sexo ?? null,
        jaCadastrado,
        pacienteId: pacienteLocal?.id ?? null,
        cpfMascarado: pacienteLocal?.cpf ? maskCPF(pacienteLocal.cpf) : null,
      },
    }
  } catch (error) {
    console.error('[buscarPacientePorCns] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível consultar o CADSUS. Tente novamente.',
    }
  }
}

export async function vincularPaciente(
  rawInput: unknown
): Promise<ActionResponse<VincularPacienteOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const cnsPreParse = buscarPacientePorCnsSchema.safeParse(rawInput)
    if (!cnsPreParse.success) {
      return {
        success: false,
        error: 'Dados inválidos.',
        fieldErrors: cnsPreParse.error.flatten().fieldErrors,
      }
    }

    const pacienteExistente = await db.paciente.findFirst({
      where: {
        tenant_id: tenantId,
        cns: cnsPreParse.data.cns,
      },
      select: {
        id: true,
        cpf: true,
      },
    })

    let cns: string
    let cpfEfetivo: string | null
    const jaCadastrado = pacienteExistente !== null

    if (pacienteExistente) {
      const parsed = vincularPacienteExistenteSchema.safeParse(rawInput)
      if (!parsed.success) {
        return {
          success: false,
          error: 'Dados inválidos.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        }
      }
      cns = parsed.data.cns
      cpfEfetivo = pacienteExistente.cpf
    } else {
      const parsed = vincularPacienteNovoSchema.safeParse(rawInput)
      if (!parsed.success) {
        return {
          success: false,
          error: 'Dados inválidos.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        }
      }
      cns = parsed.data.cns
      cpfEfetivo = parsed.data.cpf
    }

    if (!validarCNS(cns)) {
      return { success: false, error: 'CNS inválido.' }
    }

    if (!cpfEfetivo) {
      return {
        success: false,
        error: pacienteExistente
          ? 'Paciente cadastrado sem CPF. Atualize o cadastro antes de continuar.'
          : 'Informe o CPF do paciente.',
      }
    }

    if (pacienteExistente?.cpf && pacienteExistente.cpf !== cpfEfetivo) {
      await db.paciente.update({
        where: {
          id: pacienteExistente.id,
          tenant_id: tenantId,
        },
        data: {
          cadsus_divergencia: true,
        },
      })

      return {
        success: false,
        error: 'CPF divergente do registro existente para este CNS. Verifique os dados.',
      }
    }

    const tenantSettings = await loadTenantSettings(db, tenantId)
    const cadsus = getCadsusService(tenantSettings)
    const resultado = await cadsus.buscarPorCns(cns)

    if (!resultado.encontrado || !resultado.nome) {
      return { success: false, error: 'Paciente não encontrado no CADSUS.' }
    }

    const paciente = await db.paciente.upsert({
      where: {
        tenant_id_cns: {
          tenant_id: tenantId,
          cns,
        },
      },
      create: {
        tenant_id: tenantId,
        nome: resultado.nome,
        cns,
        cpf: cpfEfetivo,
        data_nascimento: parseDataNascimento(resultado.dataNascimento),
        nome_mae: resultado.nomeMae ?? null,
        municipio_nascimento: resultado.municipioNascimento ?? null,
        sexo: resultado.sexo ?? 'NAO_INFORMADO',
        cadsus_sincronizado_at: new Date(),
      },
      update: {
        cadsus_sincronizado_at: new Date(),
        cadsus_divergencia: false,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_base_paciente',
      entidadeId: paciente.id,
      payloadDepois: {
        cns: maskCns(cns),
        jaCadastrado,
      },
    })

    return {
      success: true,
      data: {
        pacienteId: paciente.id,
        jaCadastrado,
      },
    }
  } catch (error) {
    console.error('[vincularPaciente] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível vincular o paciente. Tente novamente.',
    }
  }
}
