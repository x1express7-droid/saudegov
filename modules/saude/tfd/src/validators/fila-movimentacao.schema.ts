import { z } from 'zod'

export const MIN_JUSTIFICATIVA_FILA_CHARS = 20

const tiposComJustificativaObrigatoria = ['AVANCO', 'RECUO', 'PRIORIDADE'] as const

export const moverPacienteNaFilaSchema = z
  .object({
    solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
    posicaoNova: z
      .number({ invalid_type_error: 'Informe a nova posição na fila.' })
      .int('A posição deve ser um número inteiro.')
      .min(1, 'A posição deve ser maior ou igual a 1.'),
    tipoMovimentacao: z.enum(tiposComJustificativaObrigatoria, {
      errorMap: () => ({ message: 'Tipo de movimentação inválido.' }),
    }),
    justificativa: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (data.justificativa.length < MIN_JUSTIFICATIVA_FILA_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `A justificativa deve ter pelo menos ${MIN_JUSTIFICATIVA_FILA_CHARS} caracteres.`,
        path: ['justificativa'],
      })
    }
  })

export type MoverPacienteNaFilaInput = z.infer<typeof moverPacienteNaFilaSchema>
