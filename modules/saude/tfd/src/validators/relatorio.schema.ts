import { z } from 'zod'

const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).')

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

const periodoObrigatorioBase = z.object({
  dataInicio: isoDateField,
  dataFim: isoDateField,
})

/** Relatório por prestador — volume e gastos no período. @see docs/BUSINESS_RULES.md §1.12 */
export const relatorioPrestadorSchema = periodoObrigatorioBase
  .extend({
    prestadorId: z.string().uuid('ID de prestador inválido.').optional(),
  })
  .refine((data) => data.dataFim >= data.dataInicio, {
    message: 'Data fim deve ser igual ou posterior à data início.',
    path: ['dataFim'],
  })

/** Relatório por motorista — viagens e custos no período. @see docs/BUSINESS_RULES.md §1.12 */
export const relatorioMotoristaSchema = periodoObrigatorioBase
  .extend({
    motoristaId: z.string().uuid('ID de motorista inválido.').optional(),
  })
  .refine((data) => data.dataFim >= data.dataInicio, {
    message: 'Data fim deve ser igual ou posterior à data início.',
    path: ['dataFim'],
  })

/** Produção mensal — aprovadas, negadas, concluídas e canceladas. @see docs/BUSINESS_RULES.md §1.12 */
export const relatorioProducaoMensalSchema = z.object({
  mes: mesField,
  ano: anoField,
})
