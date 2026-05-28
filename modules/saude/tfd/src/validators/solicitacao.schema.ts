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
  cpf: z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return undefined
      }
      if (typeof value === 'string' && value.trim() === '') {
        return undefined
      }
      return value
    },
    cpfAcompanhanteField.optional()
  ),
  relacao: z
    .enum(relacaoAcompanhanteValues, {
      errorMap: () => ({ message: 'Relação do acompanhante inválida.' }),
    })
    .optional()
    .default('OUTRO'),
  telefone: z
    .string()
    .trim()
    .max(20, 'Telefone deve ter no máximo 20 caracteres.')
    .optional(),
})

export const abrirSolicitacaoSchema = z
  .object({
    processoId: z.string().uuid('ID do processo inválido.').optional(),
    pacienteId: z.string().uuid('ID de paciente inválido.'),
    /** CPF do paciente (11 dígitos) — usado na validação cruzada com o acompanhante no formulário. */
    pacienteCpf: cpfPacienteRefinementField,
    especialidadeId: z.string().uuid('Especialidade inválida.').optional(),
    procedimentos: z
      .array(z.string().uuid('Procedimento inválido.'))
      .min(0)
      .optional()
      .default([]),
    prestadorId: z.string().uuid('Prestador inválido.'),
    tipoAtendimento: z.enum(tipoAtendimentoValues, {
      errorMap: () => ({ message: 'Tipo de atendimento inválido.' }),
    }),
    solicitacaoOrigemId: z.string().uuid('Solicitação de origem inválida.').optional(),
    urgencia: z.enum(urgenciaValues, {
      errorMap: () => ({ message: 'Urgência inválida.' }),
    }),
    /** Opcional; se informado, deve estar confirmado no storage ao enviar (`enviarSolicitacaoTfd`). */
    laudoAnexoId: z.string().uuid('ID do laudo inválido.').optional(),
    observacoesAbertura: z
      .string()
      .trim()
      .max(5000, 'Observações devem ter no máximo 5000 caracteres.')
      .optional(),
    acompanhanteNecessario: z.boolean().default(false),
    acompanhante: acompanhanteSchema.optional(),
  })
  .refine(
    (data) => {
      if (
        (data.tipoAtendimento === 'CONSULTA' || data.tipoAtendimento === 'RETORNO') &&
        !data.especialidadeId
      ) {
        return false
      }
      return true
    },
    {
      message: 'Especialidade obrigatória para consultas e retornos.',
      path: ['especialidadeId'],
    }
  )
  .refine(
    (data) => {
      if (data.tipoAtendimento === 'EXAME' && (data.procedimentos?.length ?? 0) < 1) {
        return false
      }
      return true
    },
    {
      message: 'Selecione pelo menos um procedimento para exames.',
      path: ['procedimentos'],
    }
  )
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
    (data) => {
      const cpfAcompanhante = data.acompanhante?.cpf
      if (!data.pacienteCpf || !cpfAcompanhante) {
        return true
      }
      return cpfsAcompanhanteEDiferenteDoPaciente(data.pacienteCpf, cpfAcompanhante)
    },
    {
      message: 'CPF do acompanhante deve ser diferente do CPF do paciente.',
      path: ['acompanhante', 'cpf'],
    }
  )

export const enviarSolicitacaoSchema = z.object({
  solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
})

export const motivoCancelamentoPresetValues = ['PRAZO_ESGOTADO', 'OUTRO'] as const

export type MotivoCancelamentoPreset = (typeof motivoCancelamentoPresetValues)[number]

/** Texto canônico quando o gestor cancela PENDENTE ≥ 60 dias (§1.9). */
export const TEXTO_MOTIVO_CANCELAMENTO_PRAZO_ESGOTADO =
  'Cancelamento por prazo esgotado: complemento pendente há mais de 60 dias sem retorno do solicitante.'

const MIN_MOTIVO_CANCELAMENTO_CHARS = 20

/** @see docs/API_CONTRACTS.md §6.13 — cancelarSolicitacaoTfd */
export const cancelarSolicitacaoSchema = z
  .object({
    solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
    motivoPreset: z
      .enum(motivoCancelamentoPresetValues, {
        errorMap: () => ({ message: 'Motivo de cancelamento inválido.' }),
      })
      .default('OUTRO'),
    motivo: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    const texto = resolveMotivoCancelamentoTexto(data)

    if (texto.length < MIN_MOTIVO_CANCELAMENTO_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `O motivo deve ter pelo menos ${MIN_MOTIVO_CANCELAMENTO_CHARS} caracteres.`,
        path: ['motivo'],
      })
    }
  })

/**
 * Texto final gravado em `motivo_cancelamento` (§1.9, §1.13).
 * Preset PRAZO_ESGOTADO usa texto canônico se `motivo` for curto.
 */
export function resolveMotivoCancelamentoTexto(input: {
  motivoPreset: MotivoCancelamentoPreset
  motivo: string
}): string {
  const motivo = input.motivo.trim()

  if (input.motivoPreset === 'PRAZO_ESGOTADO') {
    if (motivo.length >= MIN_MOTIVO_CANCELAMENTO_CHARS) {
      return motivo
    }
    return TEXTO_MOTIVO_CANCELAMENTO_PRAZO_ESGOTADO
  }

  return motivo
}

export type AbrirSolicitacaoInput = z.infer<typeof abrirSolicitacaoSchema>
export type EnviarSolicitacaoInput = z.infer<typeof enviarSolicitacaoSchema>
export type CancelarSolicitacaoInput = z.infer<typeof cancelarSolicitacaoSchema>

export type TfdTipoAtendimento = (typeof tipoAtendimentoValues)[number]
export type TfdUrgencia = (typeof urgenciaValues)[number]
export type TfdRelacaoAcompanhante = (typeof relacaoAcompanhanteValues)[number]
