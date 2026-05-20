'use server'

import { createHash, randomBytes } from 'crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { findValidPasswordResetByTokenHash, getPrismaForTenant } from '@saude/core-db'
import type { ActionResponse } from '@saude/validators'
import { hashPassword } from './crypto'

const TOKEN_INVALID_MESSAGE = 'Token inválido ou expirado.'

const ONE_HOUR_MS = 60 * 60 * 1000

const solicitarRecuperacaoSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
})

const redefinirSenhaSchema = z
  .object({
    token: z.string().min(1, 'Token inválido ou expirado.'),
    novaSenha: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
    confirmarSenha: z.string().min(8, 'Confirme a nova senha.'),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  })

async function getTenantIdFromHeaders(): Promise<string | null> {
  const h = await headers()
  return h.get('x-tenant-id')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function getAppBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3001'
}

export async function solicitarRecuperacaoSenha(
  rawInput: unknown
): Promise<ActionResponse> {
  const parsed = solicitarRecuperacaoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const tenantId = await getTenantIdFromHeaders()
  if (!tenantId) {
    return { success: true, data: undefined }
  }

  const email = parsed.data.email.trim().toLowerCase()

  try {
    const db = await getPrismaForTenant(tenantId)

    const user = await db.user.findFirst({
      where: {
        tenant_id: tenantId,
        email,
        deleted_at: null,
        active: true,
      },
      select: { id: true },
    })

    if (!user) {
      return { success: true, data: undefined }
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + ONE_HOUR_MS)

    await db.passwordReset.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    })

    const resetLink = `${getAppBaseUrl()}/redefinir-senha/${token}`

    if (process.env.NODE_ENV === 'development') {
      console.warn('[solicitarRecuperacaoSenha] Link de recuperação (apenas dev):', resetLink)
    }

    await db.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: user.id,
        acao: 'PASSWORD_RESET_REQUESTED',
        entidade: 'users',
        entidade_id: user.id,
      },
    })

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[solicitarRecuperacaoSenha] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: true, data: undefined }
  }
}

export async function redefinirSenha(rawInput: unknown): Promise<ActionResponse> {
  const parsed = redefinirSenhaSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { token, novaSenha } = parsed.data
  const tokenHash = hashToken(token)

  try {
    const resetRecord = await findValidPasswordResetByTokenHash(tokenHash)

    const tenantId = resetRecord?.user.tenant_id
    if (
      !resetRecord ||
      !tenantId ||
      !resetRecord.user.active ||
      resetRecord.user.deleted_at
    ) {
      return { success: false, error: TOKEN_INVALID_MESSAGE }
    }

    const db = await getPrismaForTenant(tenantId)
    const passwordHash = await hashPassword(novaSenha)

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: resetRecord.user.id },
        data: { password_hash: passwordHash },
      })
      await tx.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used_at: new Date() },
      })
    })

    await db.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: resetRecord.user.id,
        acao: 'PASSWORD_CHANGED',
        entidade: 'users',
        entidade_id: resetRecord.user.id,
      },
    })

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[redefinirSenha] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: TOKEN_INVALID_MESSAGE }
  }
}
