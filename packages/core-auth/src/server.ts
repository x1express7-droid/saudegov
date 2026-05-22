import 'server-only'

export type { SaudeMunicSession, UserRole } from './types/session'

export { BCRYPT_ROUNDS, hashPassword, verifyPassword } from './crypto'

export { maskCPF, maskCNS, maskEmail, maskToken } from './masking'

export { resolveTenant, type TenantContext } from './tenant-resolver'

export { getTenantContext, assertModuleActive } from './get-tenant-context'

export { solicitarRecuperacaoSenha, redefinirSenha } from './password-reset'

export {
  criarSubdominio,
  registrarDominioCustomizado,
  removerRegistroDns,
  type CloudflareDnsResult,
} from './cloudflare-domains'

export {
  requireAuth,
  requireSuperAdmin,
  requireTenantRole,
  requirePermission,
} from './authorization'

export { hasRole, hasPermission, isSuperAdmin } from './permissions'
