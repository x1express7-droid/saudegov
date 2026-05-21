import { z } from 'zod'

const decisaoValues = ['APROVADO', 'NEGADO'] as const

export const decidirSolicitacaoSchema = z
  .object({
    solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
    decisao: z.enum(decisaoValues, {
      errorMap: () => ({ message: 'Decisão inválida.' }),
    }),
    fundamentacao: z
      .string()
      .trim()
      .min(20, 'A fundamentação deve ter pelo menos 20 caracteres.'),
    saldoId: z.string().uuid('ID do saldo inválido.').optional(),
    valorEstimado: z
      .number({
        invalid_type_error: 'Valor estimado inválido.',
      })
      .positive('O valor estimado deve ser positivo.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decisao !== 'APROVADO') {
      return
    }

    if (!data.saldoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione o saldo financeiro para aprovação.',
        path: ['saldoId'],
      })
    }

    if (data.valorEstimado === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o valor estimado da viagem.',
        path: ['valorEstimado'],
      })
    }
  })

export type DecidirSolicitacaoInput = z.infer<typeof decidirSolicitacaoSchema>
