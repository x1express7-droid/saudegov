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
