import fs from 'node:fs'

const csvPath = new URL('./CID10CSV/CID-10-SUBCATEGORIAS.CSV', import.meta.url)
const outPath = new URL('./tfd-cid-completo-data.ts', import.meta.url)

const content = fs.readFileSync(csvPath, 'latin1')
const lines = content.split(/\r?\n/).filter((line) => line.trim())
const items = []
const seen = new Set()

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(';')
  const subcat = parts[0]?.trim()
  const desc = parts[4]?.trim()
  if (!subcat || !desc) {
    continue
  }

  const codigo =
    subcat.length === 4 ? `${subcat.slice(0, 3)}.${subcat[3]}` : subcat

  if (seen.has(codigo)) {
    continue
  }
  seen.add(codigo)

  const descricao = desc.length > 490 ? desc.slice(0, 490) : desc
  items.push({ codigo, descricao })
}

items.sort((a, b) => a.codigo.localeCompare(b.codigo))

function escapeTs(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ')
}

const chunks = [
  '// BLOCO-CID-COMPLETO',
  '/** CID-10 versão 2008 (DATASUS/SUS) — subcategorias oficiais para codificação. */',
  'export const TFD_CID_COMPLETO_ITEMS: ReadonlyArray<{ codigo: string; descricao: string }> = [',
]

for (const item of items) {
  chunks.push(
    `  { codigo: '${escapeTs(item.codigo)}', descricao: '${escapeTs(item.descricao)}' },`
  )
}

chunks.push('] as const', '')

fs.writeFileSync(outPath, chunks.join('\n'), 'utf8')
console.log(`Generated ${items.length} items`)
console.log(`File size: ${fs.statSync(outPath).size}`)
