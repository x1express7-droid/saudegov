import { z } from 'zod'

import {
  cpfAcompanhanteField,
  cpfPacienteRefinementField,
  cpfsAcompanhanteEDiferenteDoPaciente,
} from './cpf-acompanhante'

const tipoAtendimentoValues = ['CONSULTA', 'RETORNO', 'EXAME', 'CIRURGIA'] as const

const urgenciaValues = ['BAIXA', 'INTERMEDIARIA', 'GRAVE', 'MUITO_URGENTE'] as const

const relacaoAcompanhanteValues = [
  'CONJUGE',
  'FILHO_A',
  'PAI_MAE',
  'RESPONSAVEL_LEGAL',
  'CUIDADOR',
  'OUTRO',
] as const

const acompanhanteSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, 'Nome do acompanhante deve ter pelo menos 3 caracteres.')
    .max(200, 'Nome do acompanhante deve ter no máximo 200 caracteres.'),
  cpf: cpfAcompanhanteField,
  relacao: z.enum(relacaoAcompanhanteValues, {
    errorMap: () => ({ message: 'Relação do acompanhante inválida.' }),
  }),
  telefone: z
    .string()
    .trim()
    .max(20, 'Telefone deve ter no máximo 20 caracteres.')
    .optional(),
})

export const abrirSolicitacaoSchema = z
  .object({
    pacienteId: z.string().uuid('ID de paciente inválido.'),
    /** CPF do paciente (11 dígitos) — usado na validação cruzada com o acompanhante no formulário. */
    pacienteCpf: cpfPacienteRefinementField,
    especialidadeId: z.string().uuid('Especialidade inválida.'),
    procedimentos: z
      .array(z.string().uuid('Procedimento inválido.'))
      .min(1, 'Selecione pelo menos um procedimento.'),
    prestadorId: z.string().uuid('Prestador inválido.'),
    tipoAtendimento: z.enum(tipoAtendimentoValues, {
      errorMap: () => ({ message: 'Tipo de atendimento inválido.' }),
    }),
    solicitacaoOrigemId: z.string().uuid('Solicitação de origem inválida.').optional(),
    urgencia: z.enum(urgenciaValues, {
      errorMap: () => ({ message: 'Urgência inválida.' }),
    }),
    /** Opcional no rascunho; obrigatoriedade e confirmação no storage são validadas em `enviarSolicitacaoTfd`. */
    laudoAnexoId: z.string().uuid('ID do laudo inválido.').optional(),
    acompanhanteNecessario: z.boolean().default(false),
    acompanhante: acompanhanteSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.tipoAtendimento === 'RETORNO' && !data.solicitacaoOrigemId) {
        return false
      }
      return true
    },
    {
      message: 'Retorno exige vínculo com consulta anterior.',
      path: ['solicitacaoOrigemId'],
    }
  )
  .refine(
    (data) => {
      if (data.acompanhanteNecessario && !data.acompanhante) {
        return false
      }
      return true
    },
    {
      message: 'Informe os dados do acompanhante.',
      path: ['acompanhante'],
    }
  )
  .refine(
    (data) => {
      if (!data.acompanhanteNecessario) {
        return true
      }
      // CPF do paciente é validado no servidor (banco); no formulário pode ser omitido (LGPD).
      if (!data.pacienteCpf) {
        return true
      }
      return data.pacienteCpf.length === 11
    },
    {
      message: 'CPF do paciente inválido.',
      path: ['pacienteCpf'],
    }
  )
  .refine(
    (data) =>
      cpfsAcompanhanteEDiferenteDoPaciente(data.pacienteCpf, data.acompanhante?.cpf),
    {
      message: 'CPF do acompanhante deve ser diferente do CPF do paciente.',
      path: ['acompanhante', 'cpf'],
    }
  )

export const enviarSolicitacaoSchema = z.object({
  solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
})

/** @see docs/API_CONTRACTS.md §6.13 — cancelarSolicitacaoTfd */
export const cancelarSolicitacaoSchema = z.object({
  solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
  motivo: z
    .string()
    .trim()
    .min(20, 'O motivo deve ter pelo menos 20 caracteres.'),
})

export type AbrirSolicitacaoInput = z.infer<typeof abrirSolicitacaoSchema>
export type EnviarSolicitacaoInput = z.infer<typeof enviarSolicitacaoSchema>
export type CancelarSolicitacaoInput = z.infer<typeof cancelarSolicitacaoSchema>

export type TfdTipoAtendimento = (typeof tipoAtendimentoValues)[number]
export type TfdUrgencia = (typeof urgenciaValues)[number]
export type TfdRelacaoAcompanhante = (typeof relacaoAcompanhanteValues)[number]
