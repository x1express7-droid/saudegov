import { compare, hash } from 'bcryptjs'

/** Custo bcrypt conforme AUTH_PERMISSIONS.md (§10.1) */
export const BCRYPT_ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash)
}
