import { z } from 'zod'

const idField = z.string().uuid('ID inválido.')

const moduloChaveField = z
  .string()
  .trim()
  .min(3, 'Módulo inválido.')
  .max(50, 'Módulo inválido.')

const permissionsField = z.record(z.string().min(1), z.boolean())

export const atualizarPermissoesServidorSchema = z.object({
  servidorId: idField,
  moduloChave: moduloChaveField,
  permissions: permissionsField,
})

export type AtualizarPermissoesServidorInput = z.infer<typeof atualizarPermissoesServidorSchema>
