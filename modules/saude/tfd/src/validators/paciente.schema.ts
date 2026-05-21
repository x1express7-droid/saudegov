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
