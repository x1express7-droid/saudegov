import { z } from 'zod'

const userIdField = z.string().uuid('ID do usuário inválido.')

export const atualizarServidorSchema = z.object({
  userId: userIdField,
  nome: z
    .string()
    .trim()
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .max(200, 'O nome deve ter no máximo 200 caracteres.'),
  telefone: z
    .string()
    .trim()
    .max(20, 'O telefone deve ter no máximo 20 caracteres.')
    .optional(),
  matricula: z
    .string()
    .trim()
    .max(50, 'A matrícula deve ter no máximo 50 caracteres.')
    .optional(),
})

export type AtualizarServidorInput = z.infer<typeof atualizarServidorSchema>
