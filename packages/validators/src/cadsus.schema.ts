import { z } from 'zod'

export const atualizarCadsusConfigSchema = z.object({
  cadsusEnabled: z.boolean(),
  cadsusToken: z
    .string()
    .max(500, 'Token deve ter no máximo 500 caracteres.')
    .optional()
    .or(z.literal('')),
})

export type AtualizarCadsusConfigInput = z.infer<typeof atualizarCadsusConfigSchema>
