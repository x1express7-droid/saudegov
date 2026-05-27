import { z } from 'zod'

const cnsField = z.string().regex(/^\d{15}$/, 'CNS deve ter 15 dígitos numéricos.')

const cpfField = z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos.')

export const buscarPacientePorCnsSchema = z.object({
  cns: cnsField,
})

export type BuscarPacientePorCnsInput = z.infer<typeof buscarPacientePorCnsSchema>

export const vincularPacienteNovoSchema = z.object({
  cns: cnsField,
  cpf: cpfField,
  solicitacaoId: z.string().uuid('ID de solicitação inválido.').optional(),
})

export type VincularPacienteNovoInput = z.infer<typeof vincularPacienteNovoSchema>

export const vincularPacienteExistenteSchema = z.object({
  cns: cnsField,
  solicitacaoId: z.string().uuid('ID de solicitação inválido.').optional(),
})

export type VincularPacienteExistenteInput = z.infer<typeof vincularPacienteExistenteSchema>

const cpfOpcionalField = z
  .string()
  .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos.')
  .optional()

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value))

export const atualizarPacienteCompletoSchema = z.object({
  pacienteId: z.string().uuid('ID do paciente inválido.'),
  email: z
    .string()
    .trim()
    .email('E-mail inválido.')
    .max(255)
    .optional()
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value)),
  telefoneCelular: textoOpcional(20),
  nomeSocial: textoOpcional(200),
  racaCor: z
    .enum(['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA', 'NAO_INFORMADO'])
    .optional(),
  nacionalidade: textoOpcional(50),
  identidadeGenero: textoOpcional(50),
  responsavelLegalNome: textoOpcional(200),
  responsavelLegalCpf: cpfOpcionalField,
  telefone: textoOpcional(20),
  telefoneAlternativo: textoOpcional(20),
  cep: z
    .string()
    .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos.')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value)),
  logradouro: textoOpcional(300),
  numero: textoOpcional(20),
  complemento: textoOpcional(100),
  bairro: textoOpcional(100),
  municipio: textoOpcional(200),
  uf: z
    .string()
    .length(2, 'UF deve ter 2 caracteres.')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value)),
})

export type AtualizarPacienteCompletoInput = z.infer<typeof atualizarPacienteCompletoSchema>
