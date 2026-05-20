export type { SaudeMunicSession, UserRole } from './types/session'

export { BCRYPT_ROUNDS, hashPassword, verifyPassword } from './crypto'

export { maskCPF, maskCNS, maskEmail, maskToken } from './masking'

export { auth, handlers, signIn, signOut } from './auth.config'

export {
  resolveTenant,
  invalidateTenantCache,
  type TenantContext,
} from './tenant-resolver'

export { getTenantContext, assertModuleActive } from './get-tenant-context'

export { solicitarRecuperacaoSenha, redefinirSenha } from './password-reset'

export {
  requireAuth,
  requireTenantRole,
  requirePermission,
  hasRole,
  hasPermission,
  isSuperAdmin,
} from './authorization'
