import { formatDataHoraBr } from './format-data-hora'

/** Dados para montar o rodapé obrigatório (BUSINESS_RULES.md §1.12). */
export interface ExportRelatorioRodape {
  usuarioNome: string
  geradoEm?: Date
  timezone?: string
}

/**
 * Texto exato do rodapé: `Relatório gerado por [Nome] em [data/hora] — saudegov`
 */
export function formatRodapeExport(input: ExportRelatorioRodape): string {
  const geradoEm = input.geradoEm ?? new Date()
  const dataHora = formatDataHoraBr(geradoEm, input.timezone)
  const nome = input.usuarioNome.trim() || 'Usuário'

  return `Relatório gerado por ${nome} em ${dataHora} — saudegov`
}
