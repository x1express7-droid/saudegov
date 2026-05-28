import { z } from 'zod'

import { tenantNotificationEmailField } from './municipio.schema'

export const atualizarNotificacoesEmailConfigSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
  notificationEmail: tenantNotificationEmailField,
})

export type AtualizarNotificacoesEmailConfigInput = z.infer<
  typeof atualizarNotificacoesEmailConfigSchema
>
