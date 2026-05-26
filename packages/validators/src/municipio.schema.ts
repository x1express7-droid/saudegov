import { z } from 'zod'
import { stripCnpj, validateCnpj } from './cnpj'

export const BRAZIL_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Noronha',
  'America/Campo_Grande',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Boa_Vista',
  'America/Rio_Branco',
  'America/Eirunepe',
] as const

export type BrazilTimezone = (typeof BRAZIL_TIMEZONES)[number]

const cnpjField = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((value) => {
    if (!value || value.trim() === '') {
      return undefined
    }
    return stripCnpj(value)
  })
  .pipe(
    z
      .string()
      .length(14, 'CNPJ deve ter 14 dígitos.')
      .refine((value) => validateCnpj(value), { message: 'CNPJ inválido.' })
      .optional()
  )

const notificationEmailField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => {
    if (!value || value === '') {
      return undefined
    }
    return value.toLowerCase()
  })
  .pipe(z.string().email('E-mail de notificação inválido.').max(255).optional())

const municipioOrigemCidadeField = z
  .string()
  .trim()
  .max(200, 'Cidade deve ter no máximo 200 caracteres.')
  .optional()
  .or(z.literal(''))
  .transform((value) => (value && value.trim() !== '' ? value.trim() : undefined))

const municipioOrigemEstadoField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => {
    if (!value || value.trim() === '') {
      return undefined
    }
    const uf = value.trim().toUpperCase()
    if (uf.length !== 2) {
      return undefined
    }
    return uf
  })

export const atualizarDadosMunicipioSchema = z.object({
  cnpj: cnpjField,
  timezone: z.enum(BRAZIL_TIMEZONES, {
    errorMap: () => ({ message: 'Selecione um fuso horário válido.' }),
  }),
  notificationEmail: notificationEmailField,
  municipioOrigemCidade: municipioOrigemCidadeField,
  municipioOrigemEstado: municipioOrigemEstadoField,
})

export type AtualizarDadosMunicipioInput = z.infer<typeof atualizarDadosMunicipioSchema>
