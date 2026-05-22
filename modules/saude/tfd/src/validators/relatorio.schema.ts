import { z } from 'zod'

const mesField = z
  .number({ invalid_type_error: 'Mês inválido.' })
  .int('Mês inválido.')
  .min(1, 'Mês deve ser entre 1 e 12.')
  .max(12, 'Mês deve ser entre 1 e 12.')

const anoField = z
  .number({ invalid_type_error: 'Ano inválido.' })
  .int('Ano inválido.')
  .min(2000, 'Ano inválido.')
  .max(2100, 'Ano inválido.')

/** Relatório básico por competência (mês/ano) — Sprint 1.8. @see docs/BUSINESS_RULES.md §1.12 */
export const relatorioCompetenciaSchema = z.object({
  mes: mesField,
  ano: anoField,
})

/** Relatório por paciente — histórico sem dados clínicos. @see docs/BUSINESS_RULES.md §1.12 */
export const relatorioPacienteSchema = z.object({
  pacienteId: z.string().uuid('ID de paciente inválido.'),
})
