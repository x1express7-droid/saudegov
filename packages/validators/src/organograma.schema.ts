import { z } from 'zod'

const nomeField = z
  .string()
  .trim()
  .min(3, 'Nome deve ter pelo menos 3 caracteres.')
  .max(200, 'Nome deve ter no máximo 200 caracteres.')

const siglaField = z
  .string()
  .trim()
  .max(20, 'Sigla deve ter no máximo 20 caracteres.')
  .optional()
  .or(z.literal(''))

const responsavelIdField = z.string().uuid('Responsável inválido.').optional()

const idField = z.string().uuid('ID inválido.')

export const criarDepartamentoSchema = z.object({
  nome: nomeField,
  sigla: siglaField,
  responsavelId: responsavelIdField,
})

export const atualizarDepartamentoSchema = z.object({
  id: idField,
  nome: nomeField.optional(),
  sigla: siglaField,
  responsavelId: responsavelIdField.nullable().optional(),
})

export const desativarDepartamentoSchema = z.object({
  id: idField,
})

export const criarSetorSchema = z.object({
  nome: nomeField,
  sigla: siglaField,
  departamentoId: z.string().uuid('Departamento inválido.'),
  emailSetor: z
    .string()
    .trim()
    .email('E-mail do setor inválido.')
    .max(255)
    .optional()
    .or(z.literal('')),
  responsavelId: responsavelIdField,
})

export const atualizarSetorSchema = z.object({
  id: idField,
  nome: nomeField.optional(),
  sigla: siglaField,
  emailSetor: z
    .string()
    .trim()
    .email('E-mail do setor inválido.')
    .max(255)
    .optional()
    .or(z.literal(''))
    .nullable(),
  responsavelId: responsavelIdField.nullable().optional(),
})

export const desativarSetorSchema = z.object({
  id: idField,
})

export type CriarDepartamentoInput = z.infer<typeof criarDepartamentoSchema>
export type AtualizarDepartamentoInput = z.infer<typeof atualizarDepartamentoSchema>
export type CriarSetorInput = z.infer<typeof criarSetorSchema>
export type AtualizarSetorInput = z.infer<typeof atualizarSetorSchema>

export const definirSetorResponsavelModuloSchema = z.object({
  modulo: z
    .string()
    .trim()
    .min(3, 'Módulo inválido.')
    .regex(/^saude\.[a-z0-9_]+$/, 'Módulo inválido.'),
  setorId: z.string().uuid('Setor inválido.'),
})

export type DefinirSetorResponsavelModuloInput = z.infer<typeof definirSetorResponsavelModuloSchema>
