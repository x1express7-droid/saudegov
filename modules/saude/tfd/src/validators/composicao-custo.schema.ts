import { z } from 'zod'

const TFD_TIPOS_DESPESA_ATIVOS = [
  'TRANSPORTE_TERRESTRE',
  'TRANSPORTE_AEREO',
  'TRANSPORTE_FLUVIAL',
  'DIARIA_PACIENTE',
  'DIARIA_ACOMPANHANTE',
  'DIARIA_LIVRE',
  'OBITO',
  'DEVOLUCAO',
] as const

const tipoDespesaAtivoField = z.enum(TFD_TIPOS_DESPESA_ATIVOS, {
  errorMap: () => ({ message: 'Tipo de despesa inválido.' }),
})

const valorField = z
  .number({ invalid_type_error: 'Valor inválido.' })
  .positive('O valor deve ser positivo.')
  .max(99_999_999.99, 'Valor muito alto.')

export const registrarCustoComposicaoSolicitacaoSchema = z.object({
  solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
  tipo: tipoDespesaAtivoField,
  descricao: z
    .string()
    .trim()
    .max(300, 'A descrição deve ter no máximo 300 caracteres.')
    .optional(),
  valor: valorField,
  quantidadeDias: z
    .number({ invalid_type_error: 'Quantidade de dias inválida.' })
    .int('Informe um número inteiro de dias.')
    .min(1, 'Informe pelo menos 1 dia.')
    .optional(),
})

export type RegistrarCustoComposicaoSolicitacaoInput = z.infer<
  typeof registrarCustoComposicaoSolicitacaoSchema
>
