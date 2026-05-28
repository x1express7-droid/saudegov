'use server'

import { encryptTenantSecret } from '@saude/core-auth'
import { revalidatePath } from 'next/cache'
import { requireTenantRole, requirePermission } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import {
  atualizarCadsusConfigSchema,
  atualizarDadosMunicipioSchema,
  atualizarNotificacoesEmailConfigSchema,
  atualizarSmtpConfigSchema,
} from '@saude/validators'
import { CONFIG_PERMISSIONS } from '../permissions'
import {
  cadsusConfigForAudit,
  dadosMunicipioForAudit,
  mergeSettingsCadsus,
  mergeSettingsDadosMunicipio,
  mergeSettingsNotificacoesEmail,
  mergeSettingsSmtp,
  notificacoesEmailConfigForAudit,
  parseSettingsJson,
  smtpConfigForAudit,
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

export async function atualizarNotificacoesEmailConfig(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.MUNICIPIO)

  const parsed = atualizarNotificacoesEmailConfigSchema.safeParse(rawInput)
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
    const merged = mergeSettingsNotificacoesEmail(existente, {
      emailNotificationsEnabled: parsed.data.emailNotificationsEnabled,
      notificationEmail: parsed.data.notificationEmail,
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
      payloadAntes: { notificacoes_email: notificacoesEmailConfigForAudit(existente) },
      payloadDepois: { notificacoes_email: notificacoesEmailConfigForAudit(merged) },
    })

    revalidatePath(MUNICIPIO_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarNotificacoesEmailConfig] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível salvar as notificações por e-mail. Tente novamente.',
    }
  }
}

function smtpPasswordConfigured(settings: Record<string, unknown>): boolean {
  const value = settings.smtp_password_enc
  return typeof value === 'string' && value.trim() !== ''
}

export async function atualizarSmtpConfig(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.MUNICIPIO)

  const parsed = atualizarSmtpConfigSchema.safeParse(rawInput)
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

    if (!parsed.data.smtpCustomEnabled) {
      const merged = mergeSettingsSmtp(existente, { smtpCustomEnabled: false })

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
        payloadAntes: { smtp: smtpConfigForAudit(existente) },
        payloadDepois: { smtp: smtpConfigForAudit(merged) },
      })

      revalidatePath(MUNICIPIO_PATH)
      return { success: true, data: undefined }
    }

    const passwordInput = parsed.data.smtpPassword?.trim() ?? ''
    const hasExistingPassword = smtpPasswordConfigured(existente)

    if (!passwordInput && !hasExistingPassword) {
      return {
        success: false,
        error: 'Dados inválidos.',
        fieldErrors: {
          smtpPassword: ['Informe a senha SMTP para ativar o servidor customizado.'],
        },
      }
    }

    let smtpPasswordEnc: string | undefined

    if (passwordInput) {
      try {
        smtpPasswordEnc = encryptTenantSecret(passwordInput)
      } catch (error) {
        console.error('[atualizarSmtpConfig] Erro ao criptografar senha:', {
          tenantId,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        })
        return {
          success: false,
          error:
            'Não foi possível salvar a senha SMTP. Verifique TENANT_SECRETS_ENCRYPTION_KEY no ambiente.',
        }
      }
    }

    const merged = mergeSettingsSmtp(existente, {
      smtpCustomEnabled: true,
      smtpHost: parsed.data.smtpHost,
      smtpPort: parsed.data.smtpPort,
      smtpUser: parsed.data.smtpUser,
      smtpFrom: parsed.data.smtpFrom,
      smtpSecure: parsed.data.smtpSecure,
      ...(smtpPasswordEnc ? { smtpPasswordEnc } : {}),
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
      payloadAntes: { smtp: smtpConfigForAudit(existente) },
      payloadDepois: { smtp: smtpConfigForAudit(merged) },
    })

    revalidatePath(MUNICIPIO_PATH)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarSmtpConfig] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível salvar a configuração SMTP. Tente novamente.',
    }
  }
}
