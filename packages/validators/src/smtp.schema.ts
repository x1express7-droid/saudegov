import { z } from 'zod'

const smtpHostField = z
  .string()
  .trim()
  .min(1, 'Informe o host SMTP.')
  .max(255, 'Host deve ter no máximo 255 caracteres.')

const smtpPortField = z
  .number({ invalid_type_error: 'Informe a porta SMTP.' })
  .int('Porta deve ser um número inteiro.')
  .min(1, 'Porta inválida.')
  .max(65535, 'Porta inválida.')

const smtpUserField = z
  .string()
  .trim()
  .min(1, 'Informe o usuário SMTP.')
  .max(255, 'Usuário deve ter no máximo 255 caracteres.')

const smtpFromField = z
  .string()
  .trim()
  .min(1, 'Informe o remetente (From).')
  .email('E-mail remetente inválido.')
  .max(255, 'Remetente deve ter no máximo 255 caracteres.')

const smtpPasswordField = z
  .string()
  .max(500, 'Senha deve ter no máximo 500 caracteres.')
  .optional()
  .or(z.literal(''))

const smtpConfigEnabledSchema = z.object({
  smtpCustomEnabled: z.literal(true),
  smtpHost: smtpHostField,
  smtpPort: smtpPortField,
  smtpUser: smtpUserField,
  smtpFrom: smtpFromField,
  smtpPassword: smtpPasswordField,
  smtpSecure: z.boolean(),
})

const smtpConfigDisabledSchema = z.object({
  smtpCustomEnabled: z.literal(false),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpFrom: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().optional(),
})

export const atualizarSmtpConfigSchema = z.discriminatedUnion('smtpCustomEnabled', [
  smtpConfigEnabledSchema,
  smtpConfigDisabledSchema,
])

export type AtualizarSmtpConfigInput = z.infer<typeof atualizarSmtpConfigSchema>
