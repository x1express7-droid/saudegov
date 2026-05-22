'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import {
  criarSubdominio,
  hashPassword,
  registrarDominioCustomizado,
  removerRegistroDns,
  requireSuperAdmin,
} from '@saude/core-auth/server'
import {
  getPrismaAdmin,
  SECRETARIA_SAUDE_NOME,
  SECRETARIA_SAUDE_SIGLA,
} from '@saude/core-db'
import type { ActionResponse } from '@saude/validators'
import { criarMunicipioSchema } from '../validators/municipio.schema'

const ALPHANUMERIC =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function generateTempPassword(): string {
  const bytes = randomBytes(16)
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += ALPHANUMERIC[bytes[i]! % ALPHANUMERIC.length]
  }
  return password
}

export async function criarMunicipio(
  rawInput: unknown
): Promise<ActionResponse<{ tenantId: string; adminTempPassword: string }>> {
  const session = await requireSuperAdmin()

  const parsed = criarMunicipioSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const db = getPrismaAdmin()
  let cloudflareRecordId: string | null = null

  try {
    const existingSlug = await db.tenant.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    })

    if (existingSlug) {
      return {
        success: false,
        error: 'Slug já está em uso.',
        fieldErrors: { slug: ['Este slug já está em uso por outro município.'] },
      }
    }

    let primaryDomain = ''
    let domainCustom: string | null = null
    const cloudflareZoneId = process.env.CF_ZONE_ID?.trim() ?? null

    if (data.tipoDominio === 'AUTOMATICO') {
      const cloudflare = await criarSubdominio(data.slug)
      if (!cloudflare.success) {
        return { success: false, error: cloudflare.error }
      }
      primaryDomain = cloudflare.domain
      cloudflareRecordId = cloudflare.recordId
    } else {
      const customDomain = data.domainCustom!.trim().toLowerCase()

      const existingDomain = await db.tenant.findFirst({
        where: {
          OR: [{ domain: customDomain }, { domain_custom: customDomain }],
        },
        select: { id: true },
      })

      if (existingDomain) {
        return {
          success: false,
          error: 'Domínio já está em uso.',
          fieldErrors: {
            domainCustom: ['Este domínio já está cadastrado na plataforma.'],
          },
        }
      }

      const cloudflare = await registrarDominioCustomizado(customDomain)
      if (!cloudflare.success) {
        return { success: false, error: cloudflare.error }
      }

      primaryDomain = cloudflare.domain
      domainCustom = cloudflare.domain
      cloudflareRecordId = cloudflare.recordId
    }

    const adminTempPassword = generateTempPassword()
    const passwordHash = await hashPassword(adminTempPassword)

    const modulesJson = data.modules
    const themeJson = {
      municipalityName: data.nome,
      primaryColor: '#1a5fa8',
    }
    const settingsJson = {
      uf: data.uf,
    }

    const tenant = await db.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          slug: data.slug,
          name: data.nome,
          domain: primaryDomain,
          domain_custom: domainCustom,
          cloudflare_zone_id: cloudflareZoneId,
          cloudflare_record_id: cloudflareRecordId,
          modules: modulesJson,
          theme: themeJson,
          settings: settingsJson,
          active: true,
        },
      })

      await tx.user.create({
        data: {
          tenant_id: created.id,
          role: 'ADMIN',
          name: data.adminNome,
          email: data.adminEmail.toLowerCase(),
          password_hash: passwordHash,
          mustChangePassword: true,
          permissions: {},
          active: true,
        },
      })

      await tx.secretaria.create({
        data: {
          tenant_id: created.id,
          nome: SECRETARIA_SAUDE_NOME,
          sigla: SECRETARIA_SAUDE_SIGLA,
          ativa: true,
        },
      })

      return created
    })

    await db.auditLog.create({
      data: {
        tenant_id: tenant.id,
        user_id: session.user.id,
        acao: 'TENANT_CRIADO',
        entidade: 'tenants',
        entidade_id: tenant.id,
        payload_depois: {
          slug: tenant.slug,
          domain: tenant.domain,
        },
      },
    })

    revalidatePath('/municipios')

    return {
      success: true,
      data: {
        tenantId: tenant.id,
        adminTempPassword,
      },
    }
  } catch (error) {
    if (cloudflareRecordId) {
      const rollback = await removerRegistroDns(cloudflareRecordId)
      if (!rollback.success) {
        console.error('[criarMunicipio] Falha ao reverter registro DNS:', {
          error: rollback.error ?? 'Erro desconhecido',
        })
      }
    }

    console.error('[criarMunicipio] Erro ao criar município:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })

    return {
      success: false,
      error: 'Não foi possível criar o município. Tente novamente.',
    }
  }
}
