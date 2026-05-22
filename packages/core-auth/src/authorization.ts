import 'server-only'

// [PENDENTE — Sprint 0.6] Redirecionar usuários com must_change_password após login
// para fluxo de troca de senha obrigatória (painel-servidor). Login em auth.config.ts
// ainda não consulta esse campo.

import { forbidden, redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from './auth.node'
import { hasPermission, hasRole, isSuperAdmin } from './permissions'
import type { SaudeMunicSession, UserRole } from './types/session'

export { hasPermission, hasRole, isSuperAdmin } from './permissions'

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

