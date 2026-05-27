import { z } from 'zod'

const TIPO_ATENDIMENTO_VALUES = ['CONSULTA', 'RETORNO', 'EXAME', 'CIRURGIA'] as const

const dataConsultaField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da consulta inválida (use AAAA-MM-DD).')

const horaConsultaField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora da consulta inválida (use HH:mm).')
  .optional()

export const criarAgendamentoNovoSchema = z.object({
  processoId: z.string().uuid('ID do processo inválido.'),
  solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
  dataConsulta: dataConsultaField,
  horaConsulta: horaConsultaField,
  prestadorId: z.string().uuid('ID do prestador inválido.').optional(),
  profissionalNome: z
    .string()
    .trim()
    .max(200, 'O nome do profissional deve ter no máximo 200 caracteres.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  tipoAtendimento: z.enum(TIPO_ATENDIMENTO_VALUES, {
    errorMap: () => ({ message: 'Tipo de atendimento inválido.' }),
  }),
  acompanhanteId: z.string().uuid('ID do acompanhante inválido.').optional(),
  orientacoes: z
    .string()
    .trim()
    .max(2000, 'As orientações devem ter no máximo 2.000 caracteres.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

export type CriarAgendamentoNovoInput = z.infer<typeof criarAgendamentoNovoSchema>

export const registrarRetornoAgendamentoSchema = z.object({
  agendamentoId: z.string().uuid('ID do agendamento inválido.'),
})

export type RegistrarRetornoAgendamentoInput = z.infer<typeof registrarRetornoAgendamentoSchema>

export const cancelarAgendamentoSchema = z.object({
  agendamentoId: z.string().uuid('ID do agendamento inválido.'),
  motivoCancelamento: z
    .string()
    .trim()
    .min(20, 'O motivo do cancelamento deve ter pelo menos 20 caracteres.'),
})

export type CancelarAgendamentoInput = z.infer<typeof cancelarAgendamentoSchema>
