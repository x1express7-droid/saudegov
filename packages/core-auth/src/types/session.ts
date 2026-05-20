export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'GESTOR' | 'SERVIDOR'

export interface SaudeMunicSession {
  user: {
    id: string
    tenantId: string | null
    role: UserRole
    name: string
    email: string
    setorId?: string
    permissions: Record<string, boolean>
  }
  expires: string
}
