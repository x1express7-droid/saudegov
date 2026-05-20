'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import { atualizarCadsusConfigSchema, atualizarDadosMunicipioSchema } from '@saude/validators'
import { CONFIG_PERMISSIONS } from '../permissions'
import {
  cadsusConfigForAudit,
  dadosMunicipioForAudit,
  mergeSettingsCadsus,
  mergeSettingsDadosMunicipio,
  parseSettingsJson,
} from '../utils/parse-settings'

const MUNICIPIO_PATH = '/configuracoes/municipio'

export async function atualizarDadosMunicipio(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.MUNICIPIO)

  const parsed = atualizarDadosMunicipioSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })

    if (!tenant) {
      return { success: false, error: 'Município não encontrado.' }
    }

    const existente = parseSettingsJson(tenant.settings)
    const merged = mergeSettingsDadosMunicipio(existente, parsed.data)

    await db.tenant.update({
      where: { id: tenantId },
      data: { settings: merged as object },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'tenants',
      entidadeId: tenantId,
      payloadAntes: { settings: dadosMunicipioForAudit(existente) },
      payloadDepois: { settings: dadosMunicipioForAudit(merged) },
    })

    revalidatePath(MUNICIPIO_PATH)
    revalidatePath('/', 'layout')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarDadosMunicipio] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível salvar os dados do município. Tente novamente.',
    }
  }
}

export async function atualizarCadsusConfig(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.MUNICIPIO)

  const parsed = atualizarCadsusConfigSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })

    if (!tenant) {
      return { success: false, error: 'Município não encontrado.' }
    }

    const existente = parseSettingsJson(tenant.settings)
    const tokenInput = parsed.data.cadsusToken?.trim()
    const merged = mergeSettingsCadsus(existente, {
      cadsusEnabled: parsed.data.cadsusEnabled,
      ...(tokenInput ? { cadsusToken: tokenInput } : {}),
    })

    await db.tenant.update({
      where: { id: tenantId },
      data: { settings: merged as object },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'tenants',
      entidadeId: tenantId,
      payloadAntes: { cadsus: cadsusConfigForAudit(existente) },
      payloadDepois: {
        cadsus: {
          ...cadsusConfigForAudit(merged),
          cadsus_token_updated: Boolean(tokenInput),
        },
      },
    })

    revalidatePath(MUNICIPIO_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarCadsusConfig] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível salvar a configuração CADSUS. Tente novamente.',
    }
  }
}
