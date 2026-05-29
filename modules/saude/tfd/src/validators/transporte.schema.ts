import { z } from 'zod'

const TIPO_SEGMENTO_VALUES = [
  'TERRESTRE_PROPRIO',
  'TERRESTRE_TERCEIRO',
  'AEREO',
  'FLUVIAL',
  'OUTRO',
] as const

const RESPONSAVEL_PAGAMENTO_VALUES = ['MUNICIPIO', 'PACIENTE_REEMBOLSO'] as const

const dataCampo = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).')

const horaCampo = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (use HH:mm).')
  .optional()

const criarSegmentoTransporteBaseSchema = z.object({
  agendamentoId: z.string().uuid('ID do agendamento inválido.').optional(),
  viagemId: z.string().uuid('ID da viagem inválido.').optional(),
  tipoSegmento: z.enum(TIPO_SEGMENTO_VALUES, {
    errorMap: () => ({ message: 'Tipo de segmento inválido.' }),
  }),
  veiculoId: z.string().uuid('ID do veículo inválido.').optional(),
  motoristaId: z.string().uuid('ID do motorista inválido.').optional(),
  origemDescricao: z
    .string()
    .trim()
    .min(3, 'A origem deve ter pelo menos 3 caracteres.')
    .max(300, 'A origem deve ter no máximo 300 caracteres.'),
  destinoDescricao: z
    .string()
    .trim()
    .min(3, 'O destino deve ter pelo menos 3 caracteres.')
    .max(300, 'O destino deve ter no máximo 300 caracteres.'),
  dataSaida: dataCampo,
  horaSaida: horaCampo,
  dataChegada: dataCampo.optional(),
  horaChegada: horaCampo,
  custoEstimado: z
    .number({ invalid_type_error: 'Custo estimado inválido.' })
    .positive('O custo estimado deve ser positivo.')
    .optional(),
  responsavelPagamento: z
    .enum(RESPONSAVEL_PAGAMENTO_VALUES, {
      errorMap: () => ({ message: 'Responsável pelo pagamento inválido.' }),
    })
    .optional()
    .default('MUNICIPIO'),
  observacoes: z
    .string()
    .trim()
    .max(1000, 'As observações devem ter no máximo 1.000 caracteres.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

export const criarSegmentoTransporteSchema = criarSegmentoTransporteBaseSchema.superRefine(
  (data, ctx) => {
    const hasAgendamento = Boolean(data.agendamentoId)
    const hasViagem = Boolean(data.viagemId)

    if (hasAgendamento === hasViagem) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe agendamentoId ou viagemId (exatamente um).',
        path: ['agendamentoId'],
      })
    }

    if (data.tipoSegmento === 'TERRESTRE_PROPRIO') {
      if (!data.veiculoId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Veículo é obrigatório para transporte terrestre próprio.',
          path: ['veiculoId'],
        })
      }
      if (!data.motoristaId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Motorista é obrigatório para transporte terrestre próprio.',
          path: ['motoristaId'],
        })
      }
    }
  }
)

export type CriarSegmentoTransporteInput = z.infer<typeof criarSegmentoTransporteSchema>

export const confirmarTransporteSchema = z.object({
  transporteId: z.string().uuid('ID do transporte inválido.'),
})

export type ConfirmarTransporteInput = z.infer<typeof confirmarTransporteSchema>

export const registrarChegadaSchema = z.object({
  transporteId: z.string().uuid('ID do transporte inválido.'),
  kmChegada: z
    .number({ invalid_type_error: 'Quilometragem inválida.' })
    .int('A quilometragem deve ser um número inteiro.')
    .positive('A quilometragem de chegada deve ser positiva.')
    .optional(),
  dataChegada: dataCampo.optional(),
  horaChegada: horaCampo,
})

export type RegistrarChegadaInput = z.infer<typeof registrarChegadaSchema>

export const cancelarTransporteSchema = z.object({
  transporteId: z.string().uuid('ID do transporte inválido.'),
  motivo: z
    .string()
    .trim()
    .min(20, 'O motivo do cancelamento deve ter pelo menos 20 caracteres.'),
})

export type CancelarTransporteInput = z.infer<typeof cancelarTransporteSchema>
