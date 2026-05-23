import 'server-only'

import { headers } from 'next/headers'
import { getPrismaAdmin, getPrismaForTenant } from '@saude/core-db'
import { verifyPassword } from './crypto'
import type { UserRole } from './types/session'

const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

interface LoginAttemptEntry {
  count: number
  firstAttemptAt: number
}

const loginAttempts = new Map<string, LoginAttemptEntry>()

export interface AuthorizeUser {
  id: string
  tenantId: string | null
  role: UserRole
  name: string
  email: string
  setorId?: string
  permissions: Record<string, boolean>
}

function parsePermissions(value: unknown): Record<string, boolean> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  const result: Record<string, boolean> = {}
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'boolean') {
      result[key] = val
    }
  }
  return result
}

function toUserRole(role: string): UserRole {
  if (
    role === 'SUPERADMIN' ||
    role === 'ADMIN' ||
    role === 'GESTOR' ||
    role === 'SERVIDOR'
  ) {
    return role
  }
  return 'SERVIDOR'
}

type CredentialsInput = Partial<Record<'email' | 'password' | 'tenantId', unknown>>

async function getTenantIdFromHeaders(): Promise<string | null> {
  const h = await headers()
  return h.get('x-tenant-id')
}

/** Server Action do login não repassa headers do middleware ao callback Auth.js. */
async function resolveTenantId(credentials: CredentialsInput): Promise<string | null> {
  const fromForm =
    typeof credentials.tenantId === 'string' ? credentials.tenantId.trim() : ''
  if (fromForm) {
    return fromForm
  }
  return getTenantIdFromHeaders()
}

function getRateLimitKey(tenantId: string, email: string): string {
  return `${tenantId}:${email.trim().toLowerCase()}`
}

function isRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key)
  if (!entry) {
    return false
  }
  if (Date.now() - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key)
    return false
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS
}

function recordFailedAttempt(key: string): void {
  const entry = loginAttempts.get(key)
  if (!entry || Date.now() - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: Date.now() })
    return
  }
  entry.count += 1
}

function clearFailedAttempts(key: string): void {
  loginAttempts.delete(key)
}

function isValidCredentials(
  credentials: CredentialsInput
): credentials is { email: string; password: string } {
  return (
    typeof credentials.email === 'string' &&
    credentials.email.trim().length > 0 &&
    typeof credentials.password === 'string' &&
    credentials.password.length > 0
  )
}

async function recordLoginFailed(
  tenantId: string,
  userId: string | null
): Promise<void> {
  try {
    const db = await getPrismaForTenant(tenantId)
    await db.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        acao: 'LOGIN_FAILED',
        entidade: 'users',
        entidade_id: userId,
        payload_depois: { motivo: 'credenciais_invalidas' },
      },
    })
  } catch (error) {
    console.error('[auth] Falha ao registrar audit LOGIN_FAILED:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
  }
}

export async function authorizeCredentials(
  credentials: CredentialsInput
): Promise<AuthorizeUser | null> {
  if (!isValidCredentials(credentials)) {
    return null
  }

  const tenantId = await resolveTenantId(credentials)
  if (!tenantId) {
    return null
  }

  const email = credentials.email.trim().toLowerCase()
  const rateLimitKey = getRateLimitKey(tenantId, email)

  if (isRateLimited(rateLimitKey)) {
    await recordLoginFailed(tenantId, null)
    return null
  }

  const db = await getPrismaForTenant(tenantId)

  const user = await db.user.findFirst({
    where: {
      tenant_id: tenantId,
      email,
      deleted_at: null,
    },
    select: {
      id: true,
      tenant_id: true,
      role: true,
      name: true,
      email: true,
      password_hash: true,
      permissions: true,
      active: true,
    },
  })

  if (!user || !user.active || user.tenant_id !== tenantId) {
    recordFailedAttempt(rateLimitKey)
    await recordLoginFailed(tenantId, user?.id ?? null)
    return null
  }

  if (!user.password_hash) {
    recordFailedAttempt(rateLimitKey)
    await recordLoginFailed(tenantId, user.id)
    return null
  }

  const passwordValid = await verifyPassword(credentials.password, user.password_hash)
  if (!passwordValid) {
    recordFailedAttempt(rateLimitKey)
    await recordLoginFailed(tenantId, user.id)
    return null
  }

  clearFailedAttempts(rateLimitKey)

  const principalSetor = await db.servidorSetor.findFirst({
    where: {
      user_id: user.id,
      tenant_id: tenantId,
      principal: true,
      ativo: true,
    },
    select: { setor_id: true },
  })

  await db.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  })

  await db.auditLog.create({
    data: {
      tenant_id: tenantId,
      user_id: user.id,
      acao: 'LOGIN',
      entidade: 'users',
      entidade_id: user.id,
    },
  })

  return {
    id: user.id,
    tenantId: user.tenant_id,
    role: toUserRole(user.role),
    name: user.name,
    email: user.email,
    setorId: principalSetor?.setor_id,
    permissions: parsePermissions(user.permissions),
  }
}

async function recordSuperAdminLoginFailed(userId: string | null): Promise<void> {
  try {
    const db = getPrismaAdmin()
    await db.auditLog.create({
      data: {
        tenant_id: null,
        user_id: userId,
        acao: 'LOGIN_FAILED',
        entidade: 'users',
        entidade_id: userId,
        payload_depois: { motivo: 'credenciais_invalidas', contexto: 'painel_dev' },
      },
    })
  } catch (error) {
    console.error('[auth] Falha ao registrar audit LOGIN_FAILED (superadmin):', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
  }
}

/** Painel Dev — SUPERADMIN sem tenant (tenant_id null, getPrismaAdmin). */
export async function authorizeSuperAdminCredentials(
  credentials: Partial<Record<'email' | 'password', unknown>>
): Promise<AuthorizeUser | null> {
  if (!isValidCredentials(credentials)) {
    return null
  }

  const email = credentials.email.trim().toLowerCase()
  const rateLimitKey = `superadmin:${email}`

  if (isRateLimited(rateLimitKey)) {
    await recordSuperAdminLoginFailed(null)
    return null
  }

  const db = getPrismaAdmin()

  const user = await db.user.findFirst({
    where: {
      email,
      role: 'SUPERADMIN',
      tenant_id: null,
      deleted_at: null,
    },
    select: {
      id: true,
      tenant_id: true,
      role: true,
      name: true,
      email: true,
      password_hash: true,
      permissions: true,
      active: true,
    },
  })

  if (!user || !user.active || user.role !== 'SUPERADMIN') {
    recordFailedAttempt(rateLimitKey)
    await recordSuperAdminLoginFailed(user?.id ?? null)
    return null
  }

  if (!user.password_hash) {
    recordFailedAttempt(rateLimitKey)
    await recordSuperAdminLoginFailed(user.id)
    return null
  }

  const passwordValid = await verifyPassword(credentials.password, user.password_hash)
  if (!passwordValid) {
    recordFailedAttempt(rateLimitKey)
    await recordSuperAdminLoginFailed(user.id)
    return null
  }

  clearFailedAttempts(rateLimitKey)

  await db.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  })

  await db.auditLog.create({
    data: {
      tenant_id: null,
      user_id: user.id,
      acao: 'LOGIN',
      entidade: 'users',
      entidade_id: user.id,
      payload_depois: { contexto: 'painel_dev' },
    },
  })

  return {
    id: user.id,
    tenantId: null,
    role: 'SUPERADMIN',
    name: user.name,
    email: user.email,
    permissions: parsePermissions(user.permissions),
  }
}
