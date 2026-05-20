import { z } from 'zod'

const BRAZILIAN_UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

const DOMAIN_REGEX =
  /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i

export const saudeModulesSchema = z.object({
  tfd: z.boolean(),
  regul: z.boolean(),
  visa: z.boolean(),
  farma: z.boolean(),
  ubs: z.boolean(),
  sment: z.boolean(),
  vacin: z.boolean(),
})

export const criarMunicipioSchema = z
  .object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.').max(200),
    uf: z.enum(BRAZILIAN_UFS, {
      errorMap: () => ({ message: 'Selecione um estado válido.' }),
    }),
    slug: z
      .string()
      .min(3, 'Slug deve ter pelo menos 3 caracteres.')
      .max(50, 'Slug deve ter no máximo 50 caracteres.')
      .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens.'),
    tipoDominio: z.enum(['AUTOMATICO', 'CUSTOM'], {
      errorMap: () => ({ message: 'Tipo de domínio inválido.' }),
    }),
    domainCustom: z.string().optional(),
    adminNome: z
      .string()
      .min(3, 'Nome do administrador deve ter pelo menos 3 caracteres.')
      .max(200),
    adminEmail: z.string().email('Informe um e-mail válido.'),
    modules: z.object({
      saude: saudeModulesSchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (data.tipoDominio === 'CUSTOM') {
      const domain = data.domainCustom?.trim().toLowerCase()
      if (!domain) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o domínio customizado.',
          path: ['domainCustom'],
        })
        return
      }
      if (!DOMAIN_REGEX.test(domain)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Formato de domínio inválido.',
          path: ['domainCustom'],
        })
      }
    }
  })

export type CriarMunicipioInput = z.infer<typeof criarMunicipioSchema>

export function buildDomainPreview(slug: string): string {
  const normalized = slug.trim().toLowerCase().replace(/-/g, '')
  if (!normalized) {
    return '—.saudemunic.com.br'
  }
  return `${normalized}.saudemunic.com.br`
}
