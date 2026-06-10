import { z } from 'zod'

/** Valor mínimo (R$) para exigir comprovante anexado — BUSINESS_RULES.md §1.7. */
export const MIN_VALOR_COMPROVANTE = 50

const viagemIdField = z.string().uuid('ID da viagem inválido.')
const comprovanteAnexoIdField = z.string().uuid('ID do comprovante inválido.').optional()

// PC-PARTE-2: todos os 11 valores (inclui legado para histórico)
const TFD_TIPOS_DESPESA_TODOS = [
  'TRANSPORTE_TERRESTRE',
  'TRANSPORTE_AEREO',
  'TRANSPORTE_FLUVIAL',
  'DIARIA_PACIENTE',
  'DIARIA_ACOMPANHANTE',
  'OBITO',
  'DEVOLUCAO',
  'TRANSPORTE',
  'ALIMENTACAO',
  'HOSPEDAGEM',
  'OUTRO',
] as const

// PC-PARTE-2: apenas tipos ativos para novos lançamentos na viagem nova
const TFD_TIPOS_DESPESA_ATIVOS = [
  'TRANSPORTE_TERRESTRE',
  'TRANSPORTE_AEREO',
  'TRANSPORTE_FLUVIAL',
  'DIARIA_PACIENTE',
  'DIARIA_ACOMPANHANTE',
  'OBITO',
  'DEVOLUCAO',
] as const

const tipoDespesaField = z.enum(TFD_TIPOS_DESPESA_TODOS, {
  errorMap: () => ({ message: 'Tipo de despesa inválido.' }),
})

const tipoDespesaAtivoField = z.enum(TFD_TIPOS_DESPESA_ATIVOS, {
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
const viagemNovaIdField = z.string().uuid('ID da viagem inválido.')
const segmentoIdField = z.string().uuid('ID do segmento inválido.').optional()

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

// BLOCO-4.1: comprovanteAnexoId opcional — sem mínimo de valor por despesa
// PC-PARTE-2: viagem nova aceita apenas tipos ativos (Portaria 55/1999)
export const registrarDespesaViagemNovaSchema = z.object({
  viagemNovaId: viagemNovaIdField,
  segmentoId: segmentoIdField,
  tipo: tipoDespesaAtivoField,
  descricao: despesaCamposComuns.descricao,
  valor: despesaCamposComuns.valor,
  comprovanteAnexoId: despesaCamposComuns.comprovanteAnexoId,
  responsavelPagamento: despesaCamposComuns.responsavelPagamento,
})
// TODO BLOCO-4: reativar validação de comprovante após estabilização do fluxo
// .refine(comprovanteObrigatorioRefine.refine, {
//   message: comprovanteObrigatorioRefine.message,
//   path: ['comprovanteAnexoId'],
// })

export type RegistrarDespesaViagemNovaInput = z.infer<typeof registrarDespesaViagemNovaSchema>

export const enviarPrestacaoContasViagemNovaSchema = z.object({
  viagemNovaId: viagemNovaIdField,
})

export type EnviarPrestacaoContasViagemNovaInput = z.infer<
  typeof enviarPrestacaoContasViagemNovaSchema
>

export const decidirPrestacaoContasViagemNovaSchema = z
  .object({
    viagemNovaId: viagemNovaIdField,
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

export type DecidirPrestacaoContasViagemNovaInput = z.infer<
  typeof decidirPrestacaoContasViagemNovaSchema
>

export const registrarVisualizacaoComprovanteViagemNovaSchema = z.object({
  viagemNovaId: viagemNovaIdField,
  comprovanteAnexoId: comprovanteAnexoIdObrigatorioField,
})

export type RegistrarVisualizacaoComprovanteViagemNovaInput = z.infer<
  typeof registrarVisualizacaoComprovanteViagemNovaSchema
>
