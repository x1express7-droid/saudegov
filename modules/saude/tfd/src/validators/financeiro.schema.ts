import { z } from 'zod'

const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).')

const descricaoSaldoField = z
  .string()
  .trim()
  .min(3, 'Descrição deve ter pelo menos 3 caracteres.')
  .max(500, 'Descrição deve ter no máximo 500 caracteres.')

const tfdFonteRecursoSchema = z.enum(
  ['FEDERAL_FNS', 'ESTADUAL', 'MUNICIPAL_PROPRIO', 'EMENDA_PARLAMENTAR'],
  { errorMap: () => ({ message: 'Fonte de recurso inválida.' }) }
)

const valorTotalPositivoField = z
  .number({ invalid_type_error: 'Valor total inválido.' })
  .positive('Valor total deve ser positivo.')

const paginacaoExtratoFields = {
  page: z
    .number({ invalid_type_error: 'Página inválida.' })
    .int('Página inválida.')
    .min(1, 'Página deve ser no mínimo 1.')
    .optional(),
  perPage: z
    .number({ invalid_type_error: 'Itens por página inválido.' })
    .int('Itens por página inválido.')
    .min(1, 'Itens por página deve ser no mínimo 1.')
    .max(100, 'Máximo de 100 itens por página.')
    .optional(),
}

/** Campos base de cadastro de saldo (sem validação cruzada de competência). */
export const criarSaldoObjectSchema = z.object({
  descricao: descricaoSaldoField,
  fonte: tfdFonteRecursoSchema,
  valorTotal: valorTotalPositivoField,
  competenciaInicio: isoDateField,
  competenciaFim: isoDateField,
})

/** @see docs/API_CONTRACTS.md §5.5 */
export const criarSaldoSchema = criarSaldoObjectSchema.refine(
  (data) => data.competenciaFim >= data.competenciaInicio,
  {
    message: 'Competência final deve ser igual ou posterior à inicial.',
    path: ['competenciaFim'],
  }
)

/** @see docs/API_CONTRACTS.md §7.4 */
export const filtrosExtratoSchema = z.object({
  saldoId: z.string().uuid('ID do saldo inválido.'),
  dataInicio: isoDateField.optional(),
  dataFim: isoDateField.optional(),
  ...paginacaoExtratoFields,
})

/** Filtros do extrato para exportação CSV (sem paginação). @see API_CONTRACTS.md §7.4 */
export const filtrosExtratoExportSchema = z.object({
  saldoId: z.string().uuid('ID do saldo inválido.'),
  dataInicio: isoDateField.optional(),
  dataFim: isoDateField.optional(),
})

/** @see desativarSaldoTfd — inativa saldo sem apagar extrato. */
export const desativarSaldoSchema = z.object({
  saldoId: z.string().uuid('ID do saldo inválido.'),
})

/** Texto mínimo para justificativas operacionais — BUSINESS_RULES.md §1.13. */
export const MIN_TEXTO_JUSTIFICATIVA_CHARS = 20

/** @see estornarMovimentacaoSaldoTfd — BUSINESS_RULES.md §1.8 */
export const estornarMovimentacaoSaldoSchema = z.object({
  movimentacaoId: z.string().uuid('ID da movimentação inválido.'),
  justificativa: z
    .string()
    .trim()
    .min(
      MIN_TEXTO_JUSTIFICATIVA_CHARS,
      `A justificativa deve ter pelo menos ${MIN_TEXTO_JUSTIFICATIVA_CHARS} caracteres.`
    ),
})

export type CriarSaldoInput = z.infer<typeof criarSaldoSchema>
export type FiltrosExtratoInput = z.infer<typeof filtrosExtratoSchema>
export type FiltrosExtratoExportInput = z.infer<typeof filtrosExtratoExportSchema>
export type DesativarSaldoInput = z.infer<typeof desativarSaldoSchema>
export type EstornarMovimentacaoSaldoInput = z.infer<typeof estornarMovimentacaoSaldoSchema>
