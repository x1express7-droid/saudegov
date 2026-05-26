import { z } from 'zod'

const decisaoValues = ['APROVADO', 'NEGADO'] as const

const distanciaKmField = z
  .number({
    invalid_type_error: 'Distância inválida.',
  })
  .nonnegative('A distância não pode ser negativa.')
  .max(99999, 'Distância inválida.')
  .optional()

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
    /** Distância origem→destino em km (calculada ou informada pelo gestor). */
    distanciaKm: distanciaKmField,
    tratamentoExperimental: z.boolean().default(false),
    regiaoMetropolitana: z.boolean().default(false),
    pacienteHospitalizadoDestino: z.boolean().default(false),
    /**
     * Confirmação explícita das vedações subjetivas (§1.5).
     * Obrigatória na aprovação quando qualquer flag subjetiva estiver marcada.
     */
    confirmacaoVedacoes: z.boolean().default(false),
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

    const exigeConfirmacaoFlags =
      data.tratamentoExperimental ||
      data.regiaoMetropolitana ||
      data.pacienteHospitalizadoDestino

    if (exigeConfirmacaoFlags && !data.confirmacaoVedacoes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Confirme que analisou as vedações indicadas antes de aprovar a solicitação.',
        path: ['confirmacaoVedacoes'],
      })
    }
  })

export type DecidirSolicitacaoInput = z.infer<typeof decidirSolicitacaoSchema>
