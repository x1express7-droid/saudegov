import { z } from 'zod'
import { stripCpf, validateCpf } from './cpf'

const servidorRoleSchema = z.enum(['GESTOR', 'SERVIDOR'], {
  errorMap: () => ({ message: 'Papel deve ser Gestor ou Servidor.' }),
})

const cpfField = z
  .string()
  .transform((value) => stripCpf(value))
  .pipe(
    z
      .string()
      .length(11, 'CPF deve ter 11 dígitos.')
      .refine((value) => validateCpf(value), { message: 'CPF inválido.' })
  )

const nameField = z
  .string()
  .trim()
  .min(3, 'Nome deve ter pelo menos 3 caracteres.')
  .max(200, 'Nome deve ter no máximo 200 caracteres.')

const emailField = z
  .string()
  .trim()
  .email('E-mail inválido.')
  .max(255, 'E-mail deve ter no máximo 255 caracteres.')
  .transform((value) => value.toLowerCase())

const matriculaField = z
  .string()
  .trim()
  .max(50, 'Matrícula deve ter no máximo 50 caracteres.')
  .optional()
  .or(z.literal(''))

const cargoField = z
  .string()
  .trim()
  .max(200, 'Cargo deve ter no máximo 200 caracteres.')
  .optional()
  .or(z.literal(''))

const setorIdsField = z
  .array(z.string().uuid('Setor inválido.'))
  .min(1, 'Selecione pelo menos um setor.')

const idField = z.string().uuid('ID inválido.')

export const criarServidorSchema = z.object({
  name: nameField,
  email: emailField,
  cpf: cpfField,
  matricula: matriculaField,
  setorIds: setorIdsField,
  cargo: cargoField,
  role: servidorRoleSchema,
})

export const atualizarServidorSchema = z.object({
  id: idField,
  name: nameField.optional(),
  email: emailField.optional(),
  matricula: matriculaField.nullable().optional(),
  setorIds: setorIdsField.optional(),
  cargo: cargoField.nullable().optional(),
  role: servidorRoleSchema.optional(),
})

export const desativarServidorSchema = z.object({
  id: idField,
})

export type CriarServidorInput = z.infer<typeof criarServidorSchema>
export type AtualizarServidorInput = z.infer<typeof atualizarServidorSchema>
export type DesativarServidorInput = z.infer<typeof desativarServidorSchema>
