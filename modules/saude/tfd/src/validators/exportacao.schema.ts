import { z } from 'zod'

/** @see modules/saude/tfd/src/queries/listagem-export.ts */
export const LISTAGEM_EXPORT_MAX_LINHAS = 50_000

const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).')

const tfdStatusSolicitacaoValues = [
  'RASCUNHO',
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
  'NEGADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
  'CANCELADO',
] as const

const tfdUrgenciaValues = ['NAO_AGUDA', 'BAIXA', 'INTERMEDIARIA', 'GRAVE', 'MUITO_URGENTE'] as const

const tfdPrestacaoStatusValues = ['PENDENTE', 'ENVIADA', 'APROVADA', 'REJEITADA'] as const

/** Filtros da fila de solicitações para exportação CSV (sem paginação). */
export const exportSolicitacoesCsvSchema = z.object({
  status: z.enum(tfdStatusSolicitacaoValues).optional(),
  urgencia: z.enum(tfdUrgenciaValues).optional(),
  protocolo: z
    .string()
    .trim()
    .min(1, 'Protocolo inválido.')
    .max(100, 'Protocolo deve ter no máximo 100 caracteres.')
    .optional(),
})

/** Filtros de agendamentos para exportação CSV (sem paginação). */
export const exportAgendamentosCsvSchema = z.object({
  dataInicio: isoDateField.optional(),
  dataFim: isoDateField.optional(),
  motoristaId: z.string().uuid('ID do motorista inválido.').optional(),
  veiculoId: z.string().uuid('ID do veículo inválido.').optional(),
})

/** Filtros de prestações de contas para exportação CSV (sem paginação). */
export const exportPrestacoesCsvSchema = z.object({
  status: z.enum(tfdPrestacaoStatusValues).optional(),
})

/** Filtros da lista de saldos para exportação CSV. */
export const exportSaldosCsvSchema = z.object({
  incluirInativos: z.boolean().optional(),
})

export type ExportSolicitacoesCsvInput = z.infer<typeof exportSolicitacoesCsvSchema>
export type ExportAgendamentosCsvInput = z.infer<typeof exportAgendamentosCsvSchema>
export type ExportPrestacoesCsvInput = z.infer<typeof exportPrestacoesCsvSchema>
export type ExportSaldosCsvInput = z.infer<typeof exportSaldosCsvSchema>
