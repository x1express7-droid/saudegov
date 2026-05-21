import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const prisma = new PrismaClient()

async function main() {
  const tables = await prisma.$queryRawUnsafe<
    { t: string; rls: boolean; force: boolean }[]
  >(`SELECT c.relname as t, c.relrowsecurity as rls, c.relforcerowsecurity as force
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'saude_tfd' AND c.relkind = 'r' ORDER BY 1`)

  const policies = await prisma.$queryRawUnsafe<
    { tablename: string; has_using: boolean; has_check: boolean }[]
  >(`SELECT tablename, qual IS NOT NULL as has_using, with_check IS NOT NULL as has_check
     FROM pg_policies WHERE schemaname = 'saude_tfd' ORDER BY tablename`)

  writeFileSync(
    'prisma/rls-meta.json',
    JSON.stringify({ tables, policies }, null, 2)
  )
}

main().finally(() => prisma.$disconnect())
