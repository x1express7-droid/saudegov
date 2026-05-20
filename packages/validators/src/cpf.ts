/** Remove caracteres não numéricos do CPF. */
export function stripCpf(value: string): string {
  return value.replace(/\D/g, '')
}

/** Valida CPF brasileiro (11 dígitos, dígitos verificadores). */
export function validateCpf(value: string): boolean {
  const cpf = stripCpf(value)

  if (cpf.length !== 11) {
    return false
  }

  if (/^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) {
    remainder = 0
  }
  if (remainder !== Number(cpf.charAt(9))) {
    return false
  }

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) {
    remainder = 0
  }

  return remainder === Number(cpf.charAt(10))
}
