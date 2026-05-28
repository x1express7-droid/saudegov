export type { SaudeMunicSession, UserRole } from './types/session'

export { hasRole, hasPermission, isSuperAdmin } from './permissions'

export {
  BCRYPT_ROUNDS,
  hashPassword,
  verifyPassword,
  encryptTenantSecret,
  decryptTenantSecret,
  type TenantSecretPayload,
} from './crypto'
