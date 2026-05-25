import 'server-only'

// [PENDENTE — Sprint 0.6] Redirecionar usuários com must_change_password após login
// para fluxo de troca de senha obrigatória (painel-servidor). Login em auth.config.ts
// ainda não consulta esse campo.

import { headers } from 'next/headers'
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

/** SUPERADMIN (e sessões legadas) podem não ter tenantId no JWT; o middleware injeta x-tenant-id. */
async function resolveTenantIdForSession(session: SaudeMunicSession): Promise<string | null> {
  const fromSession = session.user.tenantId?.trim()
  if (fromSession) {
    return fromSession
  }

  return (await headers()).get('x-tenant-id')?.trim() ?? null
}

async function enrichSessionTenantId(session: SaudeMunicSession): Promise<SaudeMunicSession> {
  const tenantId = await resolveTenantIdForSession(session)
  if (!tenantId) {
    return session
  }

  if (session.user.tenantId === tenantId) {
    return session
  }

  return {
    ...session,
    user: {
      ...session.user,
      tenantId,
    },
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

  if (session.user.role !== 'SUPERADMIN' && !hasRole(session, minimumRole)) {
    redirect('/login')
  }

  const enriched = await enrichSessionTenantId(session)
  const tenantId = await resolveTenantIdForSession(enriched)

  if (!tenantId) {
    redirect('/login?error=tenant')
  }

  if (enriched.user.tenantId === tenantId) {
    return enriched
  }

  return {
    ...enriched,
    user: {
      ...enriched.user,
      tenantId,
    },
  }
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

