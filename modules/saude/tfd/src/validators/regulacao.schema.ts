import { z } from 'zod'

import { TFD_COMPLEMENTO_AREA_VALUES } from '../constants/complemento-area'

const solicitacaoIdField = z.string().uuid('ID da solicitação inválido.')

const textoMinimo20 = z
  .string()
  .trim()
  .min(20, 'O texto deve ter pelo menos 20 caracteres.')

export const iniciarAnaliseSchema = z.object({
  solicitacaoId: solicitacaoIdField,
})

export const solicitarComplementoSchema = z.object({
  solicitacaoId: solicitacaoIdField,
  area: z.enum(TFD_COMPLEMENTO_AREA_VALUES, {
    errorMap: () => ({ message: 'Selecione onde o complemento deve ser feito.' }),
  }),
  mensagem: textoMinimo20,
})

export const enviarComplementoSchema = z.object({
  solicitacaoId: solicitacaoIdField,
  texto: textoMinimo20,
})

export type IniciarAnaliseInput = z.infer<typeof iniciarAnaliseSchema>
export type SolicitarComplementoInput = z.infer<typeof solicitarComplementoSchema>
export type EnviarComplementoInput = z.infer<typeof enviarComplementoSchema>
