import { z } from 'zod'

const decisaoValues = ['APROVADO', 'NEGADO'] as const

export const decidirSolicitacaoSchema = z.object({
  solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
  decisao: z.enum(decisaoValues, {
    errorMap: () => ({ message: 'Decisão inválida.' }),
  }),
  fundamentacao: z.string().trim(),
})

export type DecidirSolicitacaoInput = z.infer<typeof decidirSolicitacaoSchema>
