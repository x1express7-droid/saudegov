import { formatRodapeExport, type ExportRelatorioRodape } from '../utils/export-rodape'

export interface GerarCsvRelatorioInput {
  colunas: string[]
  linhas: Array<Array<string | number | null | undefined>>
  rodape: ExportRelatorioRodape
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatCelulaCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return escapeCsvField(String(value))
}

function linhaCsv(celulas: Array<string | number | null | undefined>): string {
  return celulas.map(formatCelulaCsv).join(',')
}

/**
 * Gera conteúdo CSV (UTF-8) com cabeçalho, linhas de dados e rodapé §1.12 nas últimas linhas.
 */
export function gerarCsvRelatorio(input: GerarCsvRelatorioInput): string {
  const linhas: string[] = [linhaCsv(input.colunas)]

  for (const row of input.linhas) {
    linhas.push(linhaCsv(row))
  }

  linhas.push('')
  linhas.push(formatRodapeExport(input.rodape))

  return `${linhas.join('\n')}\n`
}
