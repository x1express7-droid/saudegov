/**
 * Remove apenas os registros demo de prestação de contas (TFD_PRESTACAO_DEMO_IDS).
 * BLOCO: cleanup-tfd-prestacao-demo
 */
import { PrismaClient } from '@prisma/client'

import { TFD_PRESTACAO_DEMO_IDS } from '../prisma/seeds/tfd-prestacao-contas-demo'
import { TFD_SALDO_SEED_IDS } from '../prisma/seeds/tfd-saldo-exemplo'

const TENANT_ID = '18ff1259-d432-40ef-a71f-7e643b93c382'
const TENANT_SLUG = 'campograndems'

const DEMO = TFD_PRESTACAO_DEMO_IDS

const TABLES_TO_VERIFY = [
  'itens_despesa',
  'prestacoes_conta',
  'viagens_legado',
  'reservas_saldo',
  'solicitacoes',
] as const

async function countByTenant(prisma: PrismaClient, table: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count FROM saude_tfd.${table} WHERE tenant_id = $1::uuid`,
    TENANT_ID
  )
  return result[0]?.count ?? 0
}

async function countDemoMovReservas(prisma: PrismaClient): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count FROM saude_tfd.movimentacoes_saldo
     WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
    TENANT_ID,
    [DEMO.movReservaAguardandoPc, DEMO.movReservaEmAnalise]
  )
  return result[0]?.count ?? 0
}

async function main() {
  const prisma = new PrismaClient()

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: TENANT_ID },
      select: { id: true, slug: true, name: true },
    })

    if (!tenant || tenant.slug !== TENANT_SLUG) {
      throw new Error(`Tenant esperado ${TENANT_SLUG} não encontrado ou ID incorreto.`)
    }

    console.log('=== LIMPEZA DEMO PRESTAÇÃO DE CONTAS ===')
    console.log(`Tenant: ${tenant.name} (${tenant.slug})\n`)

    console.log('--- ANTES ---')
    for (const table of TABLES_TO_VERIFY) {
      console.log(`${table}: ${await countByTenant(prisma, table)}`)
    }
    console.log(`movimentacoes_saldo (demo RESERVA): ${await countDemoMovReservas(prisma)}`)
    console.log(
      `processos_tfd: ${(await prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int AS count FROM public.processos WHERE tenant_id = $1::uuid AND modulo = 'saude.tfd'`,
        TENANT_ID
      ))[0]?.count ?? 0}`
    )

    await prisma.$transaction(async (tx) => {
      const del = (sql: string, ...params: unknown[]) => tx.$executeRawUnsafe(sql, ...params)

      console.log('\n--- EXECUTANDO DELETEs ---')

      const r1 = await del(
        `DELETE FROM saude_tfd.itens_despesa WHERE tenant_id = $1::uuid AND id = $2::uuid`,
        TENANT_ID,
        DEMO.despesaEmAnalise
      )
      console.log(`1. itens_despesa: ${r1}`)

      const r2 = await del(
        `DELETE FROM saude_tfd.prestacoes_conta WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
        TENANT_ID,
        [DEMO.prestacaoAguardandoPc, DEMO.prestacaoEmAnalise]
      )
      console.log(`2. prestacoes_conta: ${r2}`)

      const r3 = await del(
        `DELETE FROM saude_tfd.viagens_legado WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
        TENANT_ID,
        [DEMO.viagemAguardandoPc, DEMO.viagemEmAnalise]
      )
      console.log(`3. viagens_legado: ${r3}`)

      const r4 = await del(
        `DELETE FROM saude_tfd.reservas_saldo WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
        TENANT_ID,
        [DEMO.reservaAguardandoPc, DEMO.reservaEmAnalise]
      )
      console.log(`4. reservas_saldo: ${r4}`)

      const r5 = await del(
        `DELETE FROM saude_tfd.movimentacoes_saldo WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
        TENANT_ID,
        [DEMO.movReservaAguardandoPc, DEMO.movReservaEmAnalise]
      )
      console.log(`5. movimentacoes_saldo (RESERVA demo): ${r5}`)

      const r6 = await del(
        `DELETE FROM saude_tfd.solicitacoes WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
        TENANT_ID,
        [DEMO.solicitacaoAguardandoPc, DEMO.solicitacaoEmAnalise]
      )
      console.log(`6. solicitacoes: ${r6}`)

      const r7 = await del(
        `DELETE FROM public.processos WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[]) AND modulo = 'saude.tfd'`,
        TENANT_ID,
        [DEMO.processoAguardandoPc, DEMO.processoEmAnalise]
      )
      console.log(`7. processos TFD demo: ${r7}`)

      console.log('\nTransação commitada.')
    })

    console.log('\n--- DEPOIS ---')
    let allZero = true
    for (const table of TABLES_TO_VERIFY) {
      const count = await countByTenant(prisma, table)
      console.log(`${table}: ${count}`)
      if (count !== 0) {
        allZero = false
      }
    }

    const demoMov = await countDemoMovReservas(prisma)
    console.log(`movimentacoes_saldo (demo RESERVA): ${demoMov}`)
    if (demoMov !== 0) {
      allZero = false
    }

    const processosTfd =
      (await prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int AS count FROM public.processos WHERE tenant_id = $1::uuid AND modulo = 'saude.tfd'`,
        TENANT_ID
      ))[0]?.count ?? 0
    console.log(`processos_tfd: ${processosTfd}`)
    if (processosTfd !== 0) {
      allZero = false
    }

    const credito = await prisma.tfdMovimentacaoSaldo.findUnique({
      where: { id: TFD_SALDO_SEED_IDS.movimentacaoCredito },
      select: { id: true, tipo: true, valor: true, descricao: true },
    })

    const saldo = await prisma.tfdSaldo.findUnique({
      where: { id: TFD_SALDO_SEED_IDS.saldo },
      select: { id: true, valor_total: true, ativo: true },
    })

    console.log('\n--- SALDO PRESERVADO ---')
    console.log(
      JSON.stringify(
        {
          saldo_id: saldo?.id,
          valor_total: saldo?.valor_total?.toString(),
          ativo: saldo?.ativo,
          credito_id: credito?.id,
          credito_tipo: credito?.tipo,
          credito_valor: credito?.valor?.toString(),
        },
        null,
        2
      )
    )

    const movTotal = (await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM saude_tfd.movimentacoes_saldo WHERE tenant_id = $1::uuid`,
      TENANT_ID
    ))[0]?.count ?? 0
    console.log(`movimentacoes_saldo (total tenant): ${movTotal}`)

    const creditoOk =
      credito?.tipo === 'CREDITO' &&
      credito.valor.toString() === '50000' &&
      saldo?.valor_total.toString() === '50000'

    console.log('\n=== RESULTADO ===')
    console.log(`Tabelas operacionais zeradas: ${allZero ? 'SIM' : 'NÃO'}`)
    console.log(`CREDITO R$ 50.000 preservado: ${creditoOk ? 'SIM' : 'NÃO'}`)

    if (!allZero || !creditoOk) {
      process.exit(1)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('ERRO (ROLLBACK automático):', error)
  process.exit(1)
})
