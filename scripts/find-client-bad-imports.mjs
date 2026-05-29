import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', 'apps', 'painel-servidor')
const badPatterns = [
  /from '@saude\/mod-saude-tfd'/,
  /from "@saude\/mod-saude-tfd"/,
  /from '@saude\/core-documents'/,
  /from "@saude\/core-documents"/,
  /from '@saude\/core-auth\/server'/,
  /from "@saude\/core-auth\/server"/,
  /from '@saude\/core-notifications'/,
  /from "@saude\/core-notifications"/,
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue
      walk(p, out)
    } else if (/\.(tsx|ts)$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

for (const file of walk(root)) {
  const content = readFileSync(file, 'utf8')
  if (!content.includes("'use client'") && !content.includes('"use client"')) continue
  for (const pattern of badPatterns) {
    if (pattern.test(content)) {
      const rel = file.replace(join(import.meta.dirname, '..') + '\\', '').replace(/\\/g, '/')
      const lines = content.split('\n').filter((l) => pattern.test(l))
      console.log(rel)
      for (const l of lines) console.log(' ', l.trim())
    }
  }
}
