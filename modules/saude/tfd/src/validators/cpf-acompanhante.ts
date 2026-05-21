import { z } from 'zod'
import { stripCpf, validateCpf } from '@saude/validators'

/** CPF com 11 dígitos e dígitos verificadores válidos. */
export const cpfAcompanhanteField = z
  .string()
  .transform((value) => stripCpf(value))
  .pipe(
    z
      .string()
      .length(11, 'CPF deve ter 11 dígitos.')
      .refine((cpf) => validateCpf(cpf), { message: 'CPF do acompanhante inválido.' })
  )

/** CPF do paciente (somente dígitos) para validação cruzada no formulário. */
export const cpfPacienteRefinementField = z
  .string()
  .transform((value) => stripCpf(value))
  .pipe(z.string().length(11, 'CPF do paciente inválido.'))
  .optional()

export function cpfsAcompanhanteEDiferenteDoPaciente(
  pacienteCpf: string | undefined,
  acompanhanteCpf: string | undefined
): boolean {
  if (!pacienteCpf || !acompanhanteCpf) {
    return true
  }
  return stripCpf(pacienteCpf) !== stripCpf(acompanhanteCpf)
}
