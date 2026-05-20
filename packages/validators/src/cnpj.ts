/** Remove caracteres não numéricos do CNPJ. */
export function stripCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

/** Valida CNPJ brasileiro (14 dígitos, dígitos verificadores). */
export function validateCnpj(value: string): boolean {
  const cnpj = stripCnpj(value)

  if (cnpj.length !== 14) {
    return false
  }

  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const calcDigit = (base: string, weights: number[]): number => {
    let sum = 0
    for (let i = 0; i < weights.length; i++) {
      sum += Number(base.charAt(i)) * weights[i]!
    }
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const digit1 = calcDigit(cnpj.slice(0, 12), weights1)
  if (digit1 !== Number(cnpj.charAt(12))) {
    return false
  }

  const digit2 = calcDigit(cnpj.slice(0, 13), weights2)
  return digit2 === Number(cnpj.charAt(13))
}
