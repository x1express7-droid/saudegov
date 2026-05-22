'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantRole, requirePermission } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import { atualizarLogoSchema, atualizarTemaSchema } from '@saude/validators'
import { CONFIG_PERMISSIONS } from '../permissions'
import {
  mergeThemeCores,
  mergeThemeLogo,
  parseThemeJson,
  themeToFormValues,
} from '../utils/parse-theme'

const TEMA_PATH = '/configuracoes/tema'

async function getAdminSession() {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.TEMA)
  return session
}

function coresFromTheme(theme: ReturnType<typeof parseThemeJson>) {
  const valores = themeToFormValues(theme)
  return {
    primaryColor: valores.primaryColor,
    secondaryColor: valores.secondaryColor,
    accentColor: valores.accentColor,
  }
}

export async function atualizarTema(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await getAdminSession()

  const parsed = atualizarTemaSchema.safeParse(rawInput)
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
      select: { theme: true },
    })

    if (!tenant) {
      return { success: false, error: 'Município não encontrado.' }
    }

    const existente = parseThemeJson(tenant.theme)
    const merged = mergeThemeCores(existente, parsed.data)

    await db.tenant.update({
      where: { id: tenantId },
      data: { theme: merged },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'tenants',
      entidadeId: tenantId,
      payloadAntes: { theme: { cores: coresFromTheme(existente) } },
      payloadDepois: { theme: { cores: parsed.data } },
    })

    revalidatePath(TEMA_PATH)
    revalidatePath('/', 'layout')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarTema] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível salvar as cores. Tente novamente.',
    }
  }
}

export async function atualizarLogo(rawInput: unknown): Promise<ActionResponse<void>> {
  const session = await getAdminSession()

  const parsed = atualizarLogoSchema.safeParse(rawInput)
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
      select: { theme: true },
    })

    if (!tenant) {
      return { success: false, error: 'Município não encontrado.' }
    }

    const existente = parseThemeJson(tenant.theme)
    const logoAntes = themeToFormValues(existente).logoUrl
    const merged = mergeThemeLogo(existente, parsed.data.logoUrl)

    await db.tenant.update({
      where: { id: tenantId },
      data: { theme: merged },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'tenants',
      entidadeId: tenantId,
      payloadAntes: { theme: { logoUrl: logoAntes || null } },
      payloadDepois: { theme: { logoUrl: parsed.data.logoUrl } },
    })

    revalidatePath(TEMA_PATH)
    revalidatePath('/', 'layout')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarLogo] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível salvar a logo. Tente novamente.',
    }
  }
}
