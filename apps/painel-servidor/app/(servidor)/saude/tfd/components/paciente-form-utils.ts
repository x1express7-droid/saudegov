import { validateCpf } from '@saude/validators'

export const BUSCA_PACIENTE_DEBOUNCE_MS = 350
export const BUSCA_PACIENTE_MIN_NOME_CHARS = 2

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCpfDisplay(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 3) {
    return digits
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatTelefoneBr(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length === 0) {
    return ''
  }
  if (digits.length <= 2) {
    return `(${digits}`
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function validarCpfOpcional(value: string): string | null {
  const digits = onlyDigits(value)
  if (!digits) {
    return null
  }
  if (digits.length !== 11 || !validateCpf(digits)) {
    return 'CPF inválido.'
  }
  return null
}

export function validarCpfObrigatorio(value: string): string | null {
  const digits = onlyDigits(value)
  if (!digits) {
    return 'CPF é obrigatório.'
  }
  if (digits.length !== 11 || !validateCpf(digits)) {
    return 'CPF inválido.'
  }
  return null
}

export function validarEmailObrigatorio(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'E-mail é obrigatório.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'E-mail inválido.'
  }
  return null
}

export function validarTelefoneCelularObrigatorio(value: string): string | null {
  const digits = onlyDigits(value)
  if (!digits) {
    return 'Telefone celular é obrigatório.'
  }
  if (digits.length < 10 || digits.length > 11) {
    return 'Telefone celular inválido.'
  }
  return null
}

export function termoProntoParaBuscaPaciente(
  termo: string,
  modo: 'nome' | 'cpf' | 'cns'
): boolean {
  const trimmed = termo.trim()
  if (!trimmed) {
    return false
  }
  if (modo === 'nome') {
    return trimmed.length >= BUSCA_PACIENTE_MIN_NOME_CHARS
  }
  if (modo === 'cpf') {
    return onlyDigits(trimmed).length >= 11
  }
  return onlyDigits(trimmed).length >= 15
}

export function hintTermoBuscaPaciente(
  modo: 'nome' | 'cpf' | 'cns',
  termo: string,
  buscando: boolean
): string {
  if (buscando) {
    return 'Buscando pacientes…'
  }
  if (modo === 'nome') {
    return 'Digite para ver sugestões automaticamente.'
  }
  if (modo === 'cpf') {
    const digitos = onlyDigits(termo).length
    return digitos < 11
      ? `Informe os 11 dígitos do CPF (${digitos}/11).`
      : 'Resultados aparecem automaticamente.'
  }
  const digitos = onlyDigits(termo).length
  return digitos < 15
    ? `Informe os 15 dígitos do CNS (${digitos}/15).`
    : 'Resultados aparecem automaticamente.'
}
