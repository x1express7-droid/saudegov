import { z } from 'zod'

const TFD_TIPO_VIAGEM_VALUES = ['IDA', 'VOLTA', 'IDA_VOLTA'] as const
const TFD_VIAGEM_STATUS_V2_VALUES = [
  'PLANEJADA',
  'CONFIRMADA',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'CANCELADA',
] as const

const dataField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).')

const horaField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (use HH:mm).')
  .optional()

const decimalPositivoField = z
  .number({ invalid_type_error: 'Valor inválido.' })
  .positive('O valor deve ser positivo.')
  .optional()

export const criarViagemSchema = z.object({
  veiculoId: z.string().uuid('ID do veículo inválido.').optional(),
  motoristaId: z.string().uuid('ID do motorista inválido.').optional(),
  dataSaida: dataField,
  horaSaida: horaField,
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
  tempoEstimadoMin: z
    .number({ invalid_type_error: 'Tempo estimado inválido.' })
    .int('O tempo estimado deve ser um número inteiro.')
    .positive('O tempo estimado deve ser positivo.')
    .optional(),
  custoEstimado: decimalPositivoField,
  observacoes: z
    .string()
    .trim()
    .max(1000, 'As observações devem ter no máximo 1000 caracteres.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

export const vincularAgendamentoSchema = z.object({
  viagemId: z.string().uuid('ID da viagem inválido.'),
  agendamentoId: z.string().uuid('ID do agendamento inválido.'),
  tipoTrecho: z.enum(TFD_TIPO_VIAGEM_VALUES, {
    errorMap: () => ({ message: 'Tipo de trecho inválido.' }),
  }),
})

export const mudarStatusViagemSchema = z.object({
  viagemId: z.string().uuid('ID da viagem inválido.'),
  novoStatus: z.enum(TFD_VIAGEM_STATUS_V2_VALUES, {
    errorMap: () => ({ message: 'Status inválido.' }),
  }),
  observacao: z
    .string()
    .trim()
    .max(500, 'A observação deve ter no máximo 500 caracteres.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

export const registrarChegadaSchema = z.object({
  viagemId: z.string().uuid('ID da viagem inválido.'),
  kmChegada: z
    .number({ invalid_type_error: 'Quilometragem inválida.' })
    .int('A quilometragem deve ser um número inteiro.')
    .positive('A quilometragem deve ser positiva.')
    .optional(),
  dataChegada: dataField.optional(),
  horaChegada: horaField,
  custoReal: decimalPositivoField,
})

export const cancelarViagemSchema = z.object({
  viagemId: z.string().uuid('ID da viagem inválido.'),
  motivo: z
    .string()
    .trim()
    .min(20, 'O motivo do cancelamento deve ter pelo menos 20 caracteres.'),
})

export const desvincularPassageiroSchema = z.object({
  viagemId: z.string().uuid('ID da viagem inválido.'),
  agendamentoId: z.string().uuid('ID do agendamento inválido.'),
})

export type CriarViagemInput = z.infer<typeof criarViagemSchema>
export type VincularAgendamentoInput = z.infer<typeof vincularAgendamentoSchema>
export type MudarStatusViagemInput = z.infer<typeof mudarStatusViagemSchema>
export type RegistrarChegadaViagemInput = z.infer<typeof registrarChegadaSchema>
export type CancelarViagemInput = z.infer<typeof cancelarViagemSchema>
export type DesvincularPassageiroInput = z.infer<typeof desvincularPassageiroSchema>
