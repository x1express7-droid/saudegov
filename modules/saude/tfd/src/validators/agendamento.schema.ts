import { z } from 'zod'

const solicitacaoIdField = z.string().uuid('ID da solicitação inválido.')
const veiculoIdField = z.string().uuid('ID do veículo inválido.')
const motoristaIdField = z.string().uuid('ID do motorista inválido.')

const dataViagemField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da viagem inválida (use AAAA-MM-DD).')

const horaSaidaField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora de saída inválida (use HH:mm).')
  .optional()

export const criarAgendamentoSchema = z.object({
  solicitacaoId: solicitacaoIdField,
  veiculoId: veiculoIdField,
  motoristaId: motoristaIdField,
  dataViagem: dataViagemField,
  horaSaida: horaSaidaField,
  observacoes: z
    .string()
    .trim()
    .max(500, 'As observações devem ter no máximo 500 caracteres.')
    .optional(),
})

export type CriarAgendamentoInput = z.infer<typeof criarAgendamentoSchema>

const viagemIdField = z.string().uuid('ID da viagem inválido.')

/** API_CONTRACTS.md §6.8 — registrarRetornoTfd */
export const registrarRetornoSchema = z.object({
  viagemId: viagemIdField,
})

export type RegistrarRetornoInput = z.infer<typeof registrarRetornoSchema>
