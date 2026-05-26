import { z } from 'zod'

const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).')

export const MODULOS_SAUDE_EXPORT = [
  'tfd',
  'regul',
  'visa',
  'farma',
  'ubs',
  'sment',
  'vacin',
] as const

/** @see docs/API_CONTRACTS.md §3.5 */
export const exportacaoMunicipioSchema = z
  .object({
    tenantId: z.string().uuid('ID do município inválido.'),
    formato: z.enum(['json', 'csv'], {
      errorMap: () => ({ message: 'Formato deve ser json ou csv.' }),
    }),
    modulos: z
      .array(z.enum(MODULOS_SAUDE_EXPORT))
      .min(1, 'Informe ao menos um módulo.')
      .optional(),
    dataInicio: isoDateField.optional(),
    dataFim: isoDateField.optional(),
  })
  .refine(
    (data) => {
      if (!data.dataInicio || !data.dataFim) {
        return true
      }
      return data.dataFim >= data.dataInicio
    },
    {
      message: 'Data final deve ser igual ou posterior à inicial.',
      path: ['dataFim'],
    }
  )

export type ExportacaoMunicipioInput = z.infer<typeof exportacaoMunicipioSchema>
