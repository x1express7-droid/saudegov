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

const decisaoPrestacaoAgendamentoField = z.enum(['APROVADA', 'REJEITADA'], {
  errorMap: () => ({ message: 'Decisão inválida.' }),
})

/** Prestação de contas vinculada a agendamento (sem viagem legada). */
export const decidirPrestacaoContasAgendamentoSchema = z
  .object({
    prestacaoId: prestacaoIdField,
    decisao: decisaoPrestacaoAgendamentoField,
    observacoesGestor: observacoesGestorField,
  })
  .superRefine((data, ctx) => {
    if (data.decisao === 'APROVADA') {
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

export type DecidirPrestacaoContasAgendamentoInput = z.infer<
  typeof decidirPrestacaoContasAgendamentoSchema
>

const agendamentoIdField = z.string().uuid('ID do agendamento inválido.')
const transporteIdField = z.string().uuid('ID do transporte inválido.')

const despesaCamposComuns = {
  tipo: tipoDespesaField,
  descricao: z
    .string()
    .trim()
    .max(300, 'A descrição deve ter no máximo 300 caracteres.')
    .optional(),
  valor: valorField,
  comprovanteAnexoId: comprovanteAnexoIdField,
  responsavelPagamento: responsavelPagamentoField,
}

const comprovanteObrigatorioRefine = {
  refine: (data: { valor: number; comprovanteAnexoId?: string }) =>
    data.valor < MIN_VALOR_COMPROVANTE || Boolean(data.comprovanteAnexoId),
  message: `Comprovante obrigatório para valores iguais ou superiores a R$ ${MIN_VALOR_COMPROVANTE},00.`,
  path: ['comprovanteAnexoId'],
} as const

export const registrarDespesaAgendamentoSchema = z
  .object({
    agendamentoId: agendamentoIdField,
    ...despesaCamposComuns,
  })
  .refine(comprovanteObrigatorioRefine.refine, {
    message: comprovanteObrigatorioRefine.message,
    path: ['comprovanteAnexoId'],
  })

export type RegistrarDespesaAgendamentoInput = z.infer<typeof registrarDespesaAgendamentoSchema>

export const registrarDespesaTransporteSchema = z
  .object({
    transporteId: transporteIdField,
    ...despesaCamposComuns,
  })
  .refine(comprovanteObrigatorioRefine.refine, {
    message: comprovanteObrigatorioRefine.message,
    path: ['comprovanteAnexoId'],
  })

export type RegistrarDespesaTransporteInput = z.infer<typeof registrarDespesaTransporteSchema>
