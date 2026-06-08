import { z } from 'zod'

const descricaoCustoField = z
  .string()
  .trim()
  .min(3, 'A descrição deve ter pelo menos 3 caracteres.')
  .max(500, 'A descrição deve ter no máximo 500 caracteres.')

const valorCustoField = z
  .number({ invalid_type_error: 'Valor inválido.' })
  .positive('O valor deve ser positivo.')
  .max(99_999_999.99, 'Valor muito alto.')

const solicitacaoIdField = z.string().uuid('ID da solicitação inválido.')
const custoIdField = z.string().uuid('ID do custo inválido.')
const saldoIdField = z.string().uuid('ID do saldo inválido.')

export const adicionarCustoPlanejadoSchema = z.object({
  solicitacaoId: solicitacaoIdField,
  descricao: descricaoCustoField,
  valor: valorCustoField,
})

export const atualizarCustoPlanejadoSchema = z.object({
  custoId: custoIdField,
  descricao: descricaoCustoField,
  valor: valorCustoField,
})

export const excluirCustoPlanejadoSchema = z.object({
  custoId: custoIdField,
})

export const confirmarProjecaoFinanceiraSchema = z.object({
  solicitacaoId: solicitacaoIdField,
  saldoId: saldoIdField,
})

export type AdicionarCustoPlanejadoInput = z.infer<typeof adicionarCustoPlanejadoSchema>
export type AtualizarCustoPlanejadoInput = z.infer<typeof atualizarCustoPlanejadoSchema>
export type ExcluirCustoPlanejadoInput = z.infer<typeof excluirCustoPlanejadoSchema>
export type ConfirmarProjecaoFinanceiraInput = z.infer<typeof confirmarProjecaoFinanceiraSchema>
