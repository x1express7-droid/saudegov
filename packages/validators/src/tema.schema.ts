import { z } from 'zod'

const hexColorField = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Informe uma cor em formato hexadecimal (#RRGGBB).')

export const atualizarTemaSchema = z.object({
  primaryColor: hexColorField,
  secondaryColor: hexColorField,
  accentColor: hexColorField,
})

export const atualizarLogoSchema = z.object({
  logoUrl: z
    .string()
    .trim()
    .url('Informe uma URL válida para a logo.')
    .max(2000, 'URL muito longa.'),
})

export type AtualizarTemaInput = z.infer<typeof atualizarTemaSchema>
export type AtualizarLogoInput = z.infer<typeof atualizarLogoSchema>
