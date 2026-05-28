import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { compare, hash } from 'bcryptjs'

/** Custo bcrypt conforme AUTH_PERMISSIONS.md (§10.1) */
export const BCRYPT_ROUNDS = 12

const AES_256_GCM = 'aes-256-gcm'
const GCM_IV_LENGTH_BYTES = 12
const AES_KEY_LENGTH_BYTES = 32

/** Payload gravado em `tenants.settings` (ex.: `smtp_password_enc`) após serialização externa. */
export interface TenantSecretPayload {
  iv: string
  ciphertext: string
  tag: string
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash)
}

function resolveTenantSecretsKey(): Buffer {
  const raw = process.env.TENANT_SECRETS_ENCRYPTION_KEY?.trim()

  if (!raw) {
    throw new Error(
      'TENANT_SECRETS_ENCRYPTION_KEY não configurada. Defina a chave no ambiente para usar segredos criptografados do tenant.'
    )
  }

  try {
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === AES_KEY_LENGTH_BYTES) {
      return decoded
    }
  } catch {
    // tenta derivação abaixo
  }

  return createHash('sha256').update(raw, 'utf8').digest()
}

function parseTenantSecretPayload(encoded: string): TenantSecretPayload {
  let parsed: unknown

  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8')
    parsed = JSON.parse(json) as unknown
  } catch {
    throw new Error('Formato inválido de segredo criptografado do tenant.')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Formato inválido de segredo criptografado do tenant.')
  }

  const record = parsed as Record<string, unknown>
  const { iv, ciphertext, tag } = record

  if (typeof iv !== 'string' || typeof ciphertext !== 'string' || typeof tag !== 'string') {
    throw new Error('Formato inválido de segredo criptografado do tenant.')
  }

  return { iv, ciphertext, tag }
}

/**
 * Criptografa texto com AES-256-GCM.
 * Retorno: JSON `{ iv, ciphertext, tag }` codificado em base64 (campo `smtp_password_enc`).
 */
export function encryptTenantSecret(plain: string): string {
  const key = resolveTenantSecretsKey()
  const iv = randomBytes(GCM_IV_LENGTH_BYTES)
  const cipher = createCipheriv(AES_256_GCM, key, iv)

  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  const payload: TenantSecretPayload = {
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: tag.toString('base64'),
  }

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
}

/** Descriptografa valor produzido por `encryptTenantSecret`. */
export function decryptTenantSecret(encoded: string): string {
  const key = resolveTenantSecretsKey()
  const payload = parseTenantSecretPayload(encoded)

  const decipher = createDecipheriv(AES_256_GCM, key, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))

  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ])

  return plain.toString('utf8')
}
