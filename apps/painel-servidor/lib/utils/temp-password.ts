import { randomBytes } from 'crypto'

const ALPHANUMERIC =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** Senha temporária de 16 caracteres (exibida uma vez após cadastro). */
export function generateTempPassword(): string {
  const bytes = randomBytes(16)
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += ALPHANUMERIC[bytes[i]! % ALPHANUMERIC.length]
  }
  return password
}
