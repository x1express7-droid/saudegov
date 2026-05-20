// [PENDENTE — Sprint 0.6] Redirecionar usuários com must_change_password após login
// para fluxo de troca de senha obrigatória (painel-servidor). Login em auth.config.ts
// ainda não consulta esse campo.

import { forbidden, redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from './auth.config'
import type { SaudeMunicSession, UserRole } from './types/session'

const ROLE_LEVEL: Record<UserRole, number> = {
  SERVIDOR: 1,
  GESTOR: 2,
  ADMIN: 3,
  SUPERADMIN: 4,
}

function getRoleLevel(role: UserRole): number {
  return ROLE_LEVEL[role]
}

function isAppSession(session: unknown): session is Session {
  return (
    typeof session === 'object' &&
    session !== null &&
    'user' in session &&
    'expires' in session &&
    !!(session as Session).user
  )
}

function toSaudeMunicSession(session: Session): SaudeMunicSession {
  return {
    user: session.user,
    expires: session.expires,
  }
}

export async function requireAuth(): Promise<SaudeMunicSession> {
  const session = await auth()
  if (!isAppSession(session)) {
    redirect('/login')
  }
  return toSaudeMunicSession(session)
}

export async function requireSuperAdmin(): Promise<SaudeMunicSession> {
  const session = await requireAuth()

  if (session.user.role !== 'SUPERADMIN') {
    redirect('/login')
  }

  return session
}

export async function requireTenantRole(minimumRole: UserRole): Promise<SaudeMunicSession> {
  const session = await requireAuth()

  if (session.user.role === 'SUPERADMIN') {
    return session
  }

  if (!hasRole(session, minimumRole)) {
    redirect('/login')
  }

  return session
}

export async function requirePermission(
  session: SaudeMunicSession,
  permissionKey: string
): Promise<void> {
  if (session.user.role === 'SUPERADMIN' || session.user.role === 'ADMIN') {
    return
  }

  if (!hasPermission(session, permissionKey)) {
    forbidden()
  }
}

export function hasRole(session: SaudeMunicSession, minimumRole: UserRole): boolean {
  return getRoleLevel(session.user.role) >= getRoleLevel(minimumRole)
}

export function hasPermission(session: SaudeMunicSession, key: string): boolean {
  if (session.user.role === 'SUPERADMIN' || session.user.role === 'ADMIN') {
    return true
  }
  return session.user.permissions[key] === true
}

export function isSuperAdmin(session: SaudeMunicSession): boolean {
  return session.user.role === 'SUPERADMIN'
}
