/** Valida CEP brasileiro — exatamente 8 dígitos numéricos, sem máscara. */
export function validarCEP(cep: string): boolean {
  return /^\d{8}$/.test(cep)
}
