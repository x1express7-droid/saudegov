// BLOCO-CID-COMPLETO
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataPath = path.join(__dirname, 'tfd-cid-completo-data.ts')
const outDir = path.join(__dirname, '..', 'migrations', '20260609140000_seed_cids_campograndems')
const outPath = path.join(outDir, 'migration.sql')

const TENANT_ID = '18ff1259-d432-40ef-a71f-7e643b93c382'
const BATCH_SIZE = 500

function escapeSql(value) {
  return value.replace(/'/g, "''")
}

function parseItems(content) {
  const items = []
  const pattern = /\{\s*codigo:\s*'((?:\\'|[^'])*)',\s*descricao:\s*'((?:\\'|[^'])*)'\s*\}/g
  let match

  while ((match = pattern.exec(content)) !== null) {
    const codigo = match[1].replace(/\\'/g, "'")
    const descricao = match[2].replace(/\\'/g, "'")
    items.push({ codigo, descricao })
  }

  return items
}

const content = fs.readFileSync(dataPath, 'utf8')
const items = parseItems(content)

if (items.length === 0) {
  throw new Error('Nenhum CID encontrado em tfd-cid-completo-data.ts')
}

const header = `-- BLOCO-CID-COMPLETO
-- Seed idempotente: catálogo CID-10 completo (DATASUS 2008) para campograndems
-- Total de registros: ${items.length}

`

const chunks = [header]
let insertStatements = 0

for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
  const batch = items.slice(offset, offset + BATCH_SIZE)
  const values = batch
    .map(
      (item) =>
        `  (gen_random_uuid(), '${TENANT_ID}'::uuid, '${escapeSql(item.codigo)}', '${escapeSql(item.descricao)}', true, NOW(), NOW())`
    )
    .join(',\n')

  chunks.push(`INSERT INTO saude_tfd.cids (id, tenant_id, codigo, descricao, ativo, created_at, updated_at)
VALUES
${values}
ON CONFLICT (tenant_id, codigo) DO NOTHING;

`)
  insertStatements += 1
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outPath, chunks.join('\n'), 'utf8')

console.log(`Arquivo gerado: ${outPath}`)
console.log(`CIDs no array: ${items.length}`)
console.log(`Statements INSERT: ${insertStatements}`)
console.log(`Tamanho do arquivo: ${fs.statSync(outPath).size} bytes`)
