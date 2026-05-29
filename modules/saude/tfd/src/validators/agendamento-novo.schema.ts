import { z } from 'zod'

const TIPO_ATENDIMENTO_VALUES = ['CONSULTA', 'RETORNO', 'EXAME', 'CIRURGIA'] as const
const TFD_CONVENIO_VALUES = ['SUS', 'PARTICULAR'] as const
const TFD_TIPO_VIAGEM_VALUES = ['IDA', 'VOLTA', 'IDA_VOLTA'] as const

const dataConsultaField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da consulta inválida (use AAAA-MM-DD).')

const horaConsultaField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora da consulta inválida (use HH:mm).')
  .optional()

const horarioLocalField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:mm).')
  .optional()

const localAdicionalSchema = z.object({
  prestadorId: z.string().uuid('ID do prestador inválido.').optional(),
  procedimentoId: z.string().uuid('ID do procedimento inválido.').optional(),
  horario: horarioLocalField,
  observacao: z
    .string()
    .trim()
    .max(500, 'A observação deve ter no máximo 500 caracteres.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

const novoAcompanhanteSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'O nome do acompanhante deve ter pelo menos 2 caracteres.')
    .max(200, 'O nome do acompanhante deve ter no máximo 200 caracteres.'),
  telefone: z
    .string()
    .trim()
    .max(20, 'O telefone deve ter no máximo 20 caracteres.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

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
  convenio: z
    .enum(TFD_CONVENIO_VALUES, {
      errorMap: () => ({ message: 'Convênio inválido.' }),
    })
    .optional(),
  tipoViagem: z
    .enum(TFD_TIPO_VIAGEM_VALUES, {
      errorMap: () => ({ message: 'Tipo de viagem inválido.' }),
    })
    .optional(),
  acompanhanteIds: z.array(z.string().uuid('ID do acompanhante inválido.')).optional().default([]),
  novosAcompanhantes: z.array(novoAcompanhanteSchema).optional().default([]),
  locaisAdicionais: z.array(localAdicionalSchema).optional().default([]),
  orientacoes: z
    .string()
    .trim()
    .max(2000, 'As orientações devem ter no máximo 2.000 caracteres.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

export type CriarAgendamentoNovoInput = z.infer<typeof criarAgendamentoNovoSchema>

export const adicionarLocalAgendamentoSchema = localAdicionalSchema.extend({
  agendamentoId: z.string().uuid('ID do agendamento inválido.'),
})

export type AdicionarLocalAgendamentoInput = z.infer<typeof adicionarLocalAgendamentoSchema>

export const removerLocalAgendamentoSchema = z.object({
  localId: z.string().uuid('ID do local inválido.'),
})

export type RemoverLocalAgendamentoInput = z.infer<typeof removerLocalAgendamentoSchema>

export const adicionarAcompanhanteAgendamentoSchema = z
  .object({
    agendamentoId: z.string().uuid('ID do agendamento inválido.'),
    acompanhanteId: z.string().uuid('ID do acompanhante inválido.').optional(),
    novoAcompanhante: novoAcompanhanteSchema.optional(),
  })
  .refine((data) => Boolean(data.acompanhanteId) !== Boolean(data.novoAcompanhante), {
    message: 'Informe um acompanhante existente ou os dados de um novo acompanhante.',
    path: ['acompanhanteId'],
  })

export type AdicionarAcompanhanteAgendamentoInput = z.infer<
  typeof adicionarAcompanhanteAgendamentoSchema
>

export const removerAcompanhanteAgendamentoSchema = z.object({
  agendamentoId: z.string().uuid('ID do agendamento inválido.'),
  acompanhanteId: z.string().uuid('ID do acompanhante inválido.'),
})

export type RemoverAcompanhanteAgendamentoInput = z.infer<
  typeof removerAcompanhanteAgendamentoSchema
>

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

export type TfdConvenio = (typeof TFD_CONVENIO_VALUES)[number]
export type TfdTipoViagem = (typeof TFD_TIPO_VIAGEM_VALUES)[number]
