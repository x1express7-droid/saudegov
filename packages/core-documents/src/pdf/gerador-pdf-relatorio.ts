import 'server-only'

import PDFDocument from 'pdfkit'

import { formatRodapeExport, type ExportRelatorioRodape } from '../utils/export-rodape'

/** @deprecated Use `ExportRelatorioRodape` — mantido como alias de tipo. */
export type PdfRelatorioRodape = ExportRelatorioRodape

export interface PdfTabelaColuna {
  header: string
  key: string
  width: number
}

export interface GerarPdfRelatorioInput {
  titulo: string
  subtitulo?: string
  resumo?: Array<{ label: string; value: string }>
  colunas: PdfTabelaColuna[]
  linhas: Array<Record<string, string | number>>
  totais?: Array<{ label: string; value: string }>
  rodape: ExportRelatorioRodape
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCelula(value: string | number): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : formatMoeda(value)
  }
  return value
}

type PdfDoc = InstanceType<typeof PDFDocument>

function desenharRodape(doc: PdfDoc, rodape: ExportRelatorioRodape): void {
  const y = doc.page.height - 50
  const texto = formatRodapeExport(rodape)

  doc
    .fontSize(8)
    .fillColor('#555555')
    .text(texto, 50, y, {
      align: 'center',
      width: doc.page.width - 100,
    })
}

function desenharCabecalhoTabela(
  doc: PdfDoc,
  colunas: PdfTabelaColuna[],
  y: number
): number {
  let x = 50
  doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold')

  for (const coluna of colunas) {
    doc.text(coluna.header, x, y, { width: coluna.width, lineBreak: false })
    x += coluna.width
  }

  doc.moveTo(50, y + 14).lineTo(doc.page.width - 50, y + 14).stroke('#cccccc')
  return y + 20
}

function desenharLinhaTabela(
  doc: PdfDoc,
  colunas: PdfTabelaColuna[],
  linha: Record<string, string | number>,
  y: number
): number {
  let x = 50
  doc.fontSize(9).fillColor('#000000').font('Helvetica')

  for (const coluna of colunas) {
    const raw = linha[coluna.key]
    const texto = raw === undefined || raw === null ? '—' : formatCelula(raw)
    doc.text(texto, x, y, { width: coluna.width, lineBreak: false })
    x += coluna.width
  }

  return y + 16
}

/**
 * Gera PDF tabular com resumo, totais e rodapé obrigatório (sem gráficos).
 */
export function gerarPdfRelatorio(input: GerarPdfRelatorioInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.on('pageAdded', () => {
      desenharRodape(doc, input.rodape)
    })

    let y = 50

    doc.fontSize(16).fillColor('#000000').font('Helvetica-Bold').text(input.titulo, 50, y)
    y += 24

    if (input.subtitulo) {
      doc.fontSize(11).font('Helvetica').fillColor('#333333').text(input.subtitulo, 50, y)
      y += 18
    }

    if (input.resumo && input.resumo.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('Resumo', 50, y)
      y += 14
      doc.font('Helvetica').fontSize(9)
      for (const item of input.resumo) {
        doc.text(`${item.label}: ${item.value}`, 50, y)
        y += 14
      }
      y += 8
    }

    if (input.colunas.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('Detalhamento', 50, y)
      y += 16

      y = desenharCabecalhoTabela(doc, input.colunas, y)

      for (const linha of input.linhas) {
        if (y > doc.page.height - 100) {
          doc.addPage()
          y = 50
          y = desenharCabecalhoTabela(doc, input.colunas, y)
        }
        y = desenharLinhaTabela(doc, input.colunas, linha, y)
      }
    }

    if (input.totais && input.totais.length > 0) {
      y += 10
      if (y > doc.page.height - 120) {
        doc.addPage()
        y = 50
      }
      doc.fontSize(10).font('Helvetica-Bold').text('Totais', 50, y)
      y += 14
      doc.font('Helvetica').fontSize(9)
      for (const total of input.totais) {
        doc.text(`${total.label}: ${total.value}`, 50, y)
        y += 14
      }
    }

    desenharRodape(doc, input.rodape)
    doc.end()
  })
}
