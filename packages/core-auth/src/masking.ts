/** CPF: '12345678901' → '***.456.***-** */
export function maskCPF(cpf: string): string {
  return `***.${cpf.slice(3, 6)}.***-**`
}

/** CNS: '123456789012345' → '123 **** **** ***' */
export function maskCNS(cns: string): string {
  return `${cns.slice(0, 3)} **** **** ***`
}

/** E-mail: 'joao@gmail.com' → 'j***@gmail.com' */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) {
    return '***'
  }
  return `${local.charAt(0)}***@${domain}`
}

/** Token de recuperação / JWT parcial para logs e UI */
export function maskToken(token: string): string {
  if (token.length <= 8) {
    return '***'
  }
  return `${token.slice(0, 4)}***${token.slice(-4)}`
}
