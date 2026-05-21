import { z } from 'zod'
import { stripCnpj, validateCnpj } from '@saude/validators'

const idField = z.string().uuid('ID inválido.')

const nomeField = z
  .string()
  .trim()
  .min(3, 'Nome deve ter pelo menos 3 caracteres.')
  .max(200, 'Nome deve ter no máximo 200 caracteres.')

const estadoField = z
  .string()
  .trim()
  .length(2, 'UF deve ter 2 caracteres.')
  .transform((value) => value.toUpperCase())

const cnpjField = z
  .string()
  .transform((value) => stripCnpj(value))
  .pipe(
    z
      .string()
      .length(14, 'CNPJ deve ter 14 dígitos.')
      .refine((value) => validateCnpj(value), { message: 'CNPJ inválido.' })
  )
  .optional()
  .or(z.literal(''))

const telefoneField = z
  .string()
  .trim()
  .max(20, 'Telefone deve ter no máximo 20 caracteres.')
  .optional()
  .or(z.literal(''))

const codigoSigtapField = z
  .string()
  .trim()
  .max(20, 'Código SIGTAP deve ter no máximo 20 caracteres.')
  .optional()
  .or(z.literal(''))

const placaField = z
  .string()
  .trim()
  .min(7, 'Placa inválida.')
  .max(10, 'Placa deve ter no máximo 10 caracteres.')
  .transform((value) => value.toUpperCase())

const modeloField = z
  .string()
  .trim()
  .min(2, 'Modelo deve ter pelo menos 2 caracteres.')
  .max(100, 'Modelo deve ter no máximo 100 caracteres.')

const cnhField = z
  .string()
  .trim()
  .min(5, 'CNH inválida.')
  .max(20, 'CNH deve ter no máximo 20 caracteres.')

const cnhCategoriaField = z
  .string()
  .trim()
  .min(1, 'Categoria da CNH é obrigatória.')
  .max(5, 'Categoria da CNH deve ter no máximo 5 caracteres.')
  .transform((value) => value.toUpperCase())

const cnhValidadeField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de validade inválida (use AAAA-MM-DD).')

const especialidadesIdsField = z
  .array(z.string().uuid('Especialidade inválida.'))
  .default([])

// --- Especialidades ---

export const criarEspecialidadeSchema = z.object({
  nome: nomeField,
})

export const atualizarEspecialidadeSchema = z.object({
  id: idField,
  nome: nomeField.optional(),
  ativa: z.boolean().optional(),
})

export const desativarEspecialidadeSchema = z.object({
  id: idField,
})

// --- Procedimentos ---

export const criarProcedimentoSchema = z.object({
  especialidadeId: z.string().uuid('Especialidade inválida.'),
  nome: nomeField,
  codigoSigtap: codigoSigtapField,
})

export const atualizarProcedimentoSchema = z.object({
  id: idField,
  especialidadeId: z.string().uuid('Especialidade inválida.').optional(),
  nome: nomeField.optional(),
  codigoSigtap: codigoSigtapField.nullable().optional(),
  ativo: z.boolean().optional(),
})

export const desativarProcedimentoSchema = z.object({
  id: idField,
})

// --- Prestadores ---

export const criarPrestadorSchema = z.object({
  nome: nomeField,
  cidade: z
    .string()
    .trim()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres.')
    .max(200, 'Cidade deve ter no máximo 200 caracteres.'),
  estado: estadoField,
  cnpj: cnpjField,
  cnes: z
    .string()
    .trim()
    .max(7, 'CNES deve ter no máximo 7 caracteres.')
    .optional()
    .or(z.literal('')),
  telefone: telefoneField,
  especialidades: especialidadesIdsField,
})

export const atualizarPrestadorSchema = z.object({
  id: idField,
  nome: nomeField.optional(),
  cidade: z
    .string()
    .trim()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres.')
    .max(200, 'Cidade deve ter no máximo 200 caracteres.')
    .optional(),
  estado: estadoField.optional(),
  cnpj: cnpjField.nullable().optional(),
  cnes: z
    .string()
    .trim()
    .max(7, 'CNES deve ter no máximo 7 caracteres.')
    .optional()
    .or(z.literal(''))
    .nullable(),
  telefone: telefoneField.nullable().optional(),
  especialidades: especialidadesIdsField.optional(),
  ativo: z.boolean().optional(),
})

export const desativarPrestadorSchema = z.object({
  id: idField,
})

// --- Veículos ---

export const criarVeiculoSchema = z.object({
  placa: placaField,
  modelo: modeloField,
  capacidadePassageiros: z
    .number()
    .int('Capacidade deve ser um número inteiro.')
    .min(1, 'Capacidade mínima é 1.')
    .max(99, 'Capacidade máxima é 99.')
    .optional()
    .default(1),
})

export const atualizarVeiculoSchema = z.object({
  id: idField,
  placa: placaField.optional(),
  modelo: modeloField.optional(),
  capacidadePassageiros: z
    .number()
    .int('Capacidade deve ser um número inteiro.')
    .min(1, 'Capacidade mínima é 1.')
    .max(99, 'Capacidade máxima é 99.')
    .optional(),
  ativo: z.boolean().optional(),
})

export const desativarVeiculoSchema = z.object({
  id: idField,
})

// --- Motoristas ---

export const criarMotoristaSchema = z.object({
  userId: z.string().uuid('Usuário inválido.'),
  cnh: cnhField,
  cnhCategoria: cnhCategoriaField,
  cnhValidade: cnhValidadeField,
})

export const atualizarMotoristaSchema = z.object({
  id: idField,
  cnh: cnhField.optional(),
  cnhCategoria: cnhCategoriaField.optional(),
  cnhValidade: cnhValidadeField.optional(),
  ativo: z.boolean().optional(),
})

export const desativarMotoristaSchema = z.object({
  id: idField,
})

export type CriarEspecialidadeInput = z.infer<typeof criarEspecialidadeSchema>
export type AtualizarEspecialidadeInput = z.infer<typeof atualizarEspecialidadeSchema>
export type DesativarEspecialidadeInput = z.infer<typeof desativarEspecialidadeSchema>

export type CriarProcedimentoInput = z.infer<typeof criarProcedimentoSchema>
export type AtualizarProcedimentoInput = z.infer<typeof atualizarProcedimentoSchema>
export type DesativarProcedimentoInput = z.infer<typeof desativarProcedimentoSchema>

export type CriarPrestadorInput = z.infer<typeof criarPrestadorSchema>
export type AtualizarPrestadorInput = z.infer<typeof atualizarPrestadorSchema>
export type DesativarPrestadorInput = z.infer<typeof desativarPrestadorSchema>

export type CriarVeiculoInput = z.infer<typeof criarVeiculoSchema>
export type AtualizarVeiculoInput = z.infer<typeof atualizarVeiculoSchema>
export type DesativarVeiculoInput = z.infer<typeof desativarVeiculoSchema>

export type CriarMotoristaInput = z.infer<typeof criarMotoristaSchema>
export type AtualizarMotoristaInput = z.infer<typeof atualizarMotoristaSchema>
export type DesativarMotoristaInput = z.infer<typeof desativarMotoristaSchema>
