import { z } from 'zod'

/** Valor mínimo (R$) para exigir comprovante anexado — BUSINESS_RULES.md §1.7. */
export const MIN_VALOR_COMPROVANTE = 50

const viagemIdField = z.string().uuid('ID da viagem inválido.')
const comprovanteAnexoIdField = z.string().uuid('ID do comprovante inválido.').optional()

const tipoDespesaField = z.enum(['TRANSPORTE', 'ALIMENTACAO', 'HOSPEDAGEM', 'OUTRO'], {
  errorMap: () => ({ message: 'Tipo de despesa inválido.' }),
})

const responsavelPagamentoField = z.enum(['MUNICIPIO', 'PACIENTE_REEMBOLSO'], {
  errorMap: () => ({ message: 'Responsável pelo pagamento inválido.' }),
})

const valorField = z
  .number({ invalid_type_error: 'Valor inválido.' })
  .positive('O valor deve ser positivo.')

/** @see docs/API_CONTRACTS.md §6.9 */
export const registrarDespesaSchema = z
  .object({
    viagemId: viagemIdField,
    tipo: tipoDespesaField,
    descricao: z
      .string()
      .trim()
      .max(300, 'A descrição deve ter no máximo 300 caracteres.')
      .optional(),
    valor: valorField,
    comprovanteAnexoId: comprovanteAnexoIdField,
    responsavelPagamento: responsavelPagamentoField,
  })
  .refine(
    (data) => data.valor < MIN_VALOR_COMPROVANTE || Boolean(data.comprovanteAnexoId),
    {
      message: `Comprovante obrigatório para valores iguais ou superiores a R$ ${MIN_VALOR_COMPROVANTE},00.`,
      path: ['comprovanteAnexoId'],
    }
  )

export type RegistrarDespesaInput = z.infer<typeof registrarDespesaSchema>

const prestacaoIdField = z.string().uuid('ID da prestação inválido.')

/** @see docs/API_CONTRACTS.md §6.10 */
export const enviarPrestacaoContasSchema = z.object({
  prestacaoId: prestacaoIdField,
})

export type EnviarPrestacaoContasInput = z.infer<typeof enviarPrestacaoContasSchema>

const comprovanteAnexoIdObrigatorioField = z.string().uuid('ID do comprovante inválido.')

/** @see docs/API_CONTRACTS.md §6.11 */
export const registrarVisualizacaoComprovanteSchema = z.object({
  prestacaoId: prestacaoIdField,
  comprovanteAnexoId: comprovanteAnexoIdObrigatorioField,
})

export type RegistrarVisualizacaoComprovanteInput = z.infer<
  typeof registrarVisualizacaoComprovanteSchema
>

const observacoesGestorField = z
  .string()
  .trim()
  .max(2000, 'As observações devem ter no máximo 2000 caracteres.')
  .optional()

/** @see docs/API_CONTRACTS.md §6.12 */
export const decidirPrestacaoContasSchema = z
  .object({
    prestacaoId: prestacaoIdField,
    aprovado: z.boolean({ invalid_type_error: 'Informe se a prestação foi aprovada.' }),
    observacoesGestor: observacoesGestorField,
  })
  .superRefine((data, ctx) => {
    if (data.aprovado) {
      return
    }

    if (!data.observacoesGestor || data.observacoesGestor.length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A observação do gestor deve ter pelo menos 20 caracteres.',
        path: ['observacoesGestor'],
      })
    }
  })

export type DecidirPrestacaoContasInput = z.infer<typeof decidirPrestacaoContasSchema>
