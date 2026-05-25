import { validarCEP, validarCNS } from '@saude/validators'
import { z } from 'zod'

const sexoValues = ['MASCULINO', 'FEMININO', 'NAO_INFORMADO'] as const

const cpfOptional = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v === '' || v.length === 11, 'CPF deve ter 11 dígitos numéricos.')
  .optional()

const cnsOptional = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v === '' || validarCNS(v), 'CNS inválido.')
  .optional()

const cepOptional = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v === '' || validarCEP(v), 'CEP deve ter 8 dígitos numéricos.')
  .optional()

export const buscarPacientesAtendimentoSchema = z.object({
  termo: z.string().trim().min(1, 'Informe um termo de busca.'),
  modo: z.enum(['nome', 'cpf', 'cns']),
})

export const getPacienteAtendimentoSchema = z.object({
  pacienteId: z.string().uuid('ID de paciente inválido.'),
})

export const salvarPacienteAtendimentoSchema = z
  .object({
    pacienteId: z.string().uuid('ID de paciente inválido.').optional(),
    nome: z
      .string()
      .trim()
      .min(3, 'Nome deve ter pelo menos 3 caracteres.')
      .max(200, 'Nome deve ter no máximo 200 caracteres.'),
    cpf: cpfOptional,
    cns: cnsOptional,
    dataNascimento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida.')
      .optional()
      .or(z.literal('')),
    sexo: z.enum(sexoValues).optional(),
    nomeMae: z.string().trim().max(200).optional(),
    municipioNascimento: z.string().trim().max(200).optional(),
    cep: cepOptional,
    logradouro: z.string().trim().max(300).optional(),
    numero: z.string().trim().max(20).optional(),
    complemento: z.string().trim().max(100).optional(),
    bairro: z.string().trim().max(100).optional(),
    municipio: z.string().trim().max(200).optional(),
    uf: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === '' || /^[A-Z]{2}$/.test(v), 'UF deve ter 2 letras.')
      .optional(),
    telefone: z.string().trim().max(20).optional(),
    telefoneAlternativo: z.string().trim().max(20).optional(),
  })

export type BuscarPacientesAtendimentoInput = z.infer<typeof buscarPacientesAtendimentoSchema>
export type SalvarPacienteAtendimentoInput = z.infer<typeof salvarPacienteAtendimentoSchema>
