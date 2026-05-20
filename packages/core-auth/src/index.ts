export type { SaudeMunicSession, UserRole } from './types/session'

export { BCRYPT_ROUNDS, hashPassword, verifyPassword } from './crypto'

export { maskCPF, maskCNS, maskEmail } from './masking'

export { auth, handlers, signIn, signOut } from './auth.config'

export {
  resolveTenant,
  invalidateTenantCache,
  type TenantContext,
} from './tenant-resolver'
