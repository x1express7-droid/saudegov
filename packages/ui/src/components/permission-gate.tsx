import { hasPermission } from '@saude/core-auth/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import type { ReactNode } from 'react'

export interface PermissionGateProps {
  session: SaudeMunicSession
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({
  session,
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  if (!hasPermission(session, permission)) {
    if (fallback == null) {
      return null
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}
