import { z } from 'zod'

const campoTextoOpcional = z
  .string()
  .trim()
  .max(10000, 'Texto muito longo (máximo 10.000 caracteres).')
  .optional()
  .transform((value) => (value === '' ? undefined : value))

export const salvarDadosClinicosSchema = z
  .object({
    processoId: z.string().uuid('ID do processo inválido.'),
    subjetivo: campoTextoOpcional,
    objetivo: campoTextoOpcional,
    avaliacao: campoTextoOpcional,
    plano: campoTextoOpcional,
    motivoQuadro: campoTextoOpcional,
    observacao: campoTextoOpcional,
  })
  .superRefine((data, ctx) => {
    const preenchidos = [
      data.subjetivo,
      data.objetivo,
      data.avaliacao,
      data.plano,
      data.motivoQuadro,
      data.observacao,
    ].filter((value) => value !== undefined && value.length > 0)

    if (preenchidos.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um campo clínico para salvar.',
        path: ['subjetivo'],
      })
    }
  })

export type SalvarDadosClinicosInput = z.infer<typeof salvarDadosClinicosSchema>
