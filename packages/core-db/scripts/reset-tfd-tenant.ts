/**
 * Reset operacional TFD de um tenant (dev). Uso único — confirmado pelo gestor.
 * BLOCO: reset-tfd-tenant
 */
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const TENANT_ID = '18ff1259-d432-40ef-a71f-7e643b93c382'
const TENANT_SLUG = 'campograndems'
const PROTOCOLO_ANO = 2026

const STORAGE_TFD_DIR = path.resolve(
  process.cwd(),
  '../../apps/painel-servidor/.data/storage',
  TENANT_ID,
  'saude',
  'tfd'
)

const TABLES_TO_VERIFY = [
  'itens_despesa',
  'prestacoes_conta',
  'viagem_passageiros',
  'transporte_anexos',
  'transportes',
  'viagens',
  'viagens_legado',
  'agendamento_acompanhantes',
  'agendamento_locais',
  'agendamentos',
  'fila_movimentacoes',
  'solicitacao_anexos',
  'solicitacao_custos_planejados',
  'acompanhantes',
  'reservas_saldo',
  'movimentacoes_saldo',
  'solicitacoes',
  'processo_dados_clinicos',
] as const

async function countTfd(prisma: PrismaClient, table: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count FROM saude_tfd.${table} WHERE tenant_id = $1::uuid`,
    TENANT_ID
  )
  return result[0]?.count ?? 0
}

async function countPublic(
  prisma: PrismaClient,
  label: string,
  sql: string
): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql, TENANT_ID)
  const count = result[0]?.count ?? 0
  console.log(`${label}: ${count}`)
  return count
}

function removeStorageDir(dir: string): { removed: boolean; filesRemoved: number } {
  if (!fs.existsSync(dir)) {
    return { removed: false, filesRemoved: 0 }
  }

  let filesRemoved = 0

  function walkRemove(target: string) {
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      const full = path.join(target, entry.name)
      if (entry.isDirectory()) {
        walkRemove(full)
        fs.rmdirSync(full)
      } else {
        fs.unlinkSync(full)
        filesRemoved += 1
      }
    }
  }

  walkRemove(dir)
  fs.rmdirSync(dir)
  return { removed: true, filesRemoved }
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

    console.log('=== RESET TFD ===')
    console.log(`Tenant: ${tenant.name} (${tenant.slug})`)
    console.log(`ID: ${tenant.id}\n`)

    await prisma.$transaction(async (tx) => {
      const exec = (sql: string) => tx.$executeRawUnsafe(sql, TENANT_ID)

      console.log('Executando DELETEs em transação...\n')

      await exec(`DELETE FROM saude_tfd.itens_despesa WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.prestacoes_conta WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.viagem_passageiros WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.transporte_anexos WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.transportes WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.viagens WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.viagens_legado WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.agendamento_acompanhantes WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.agendamento_locais WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.agendamentos WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.fila_movimentacoes WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.solicitacao_anexos WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.solicitacao_custos_planejados WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.acompanhantes WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.reservas_saldo WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.movimentacoes_saldo WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.solicitacoes WHERE tenant_id = $1::uuid`)
      await exec(`DELETE FROM saude_tfd.processo_dados_clinicos WHERE tenant_id = $1::uuid`)

      await exec(`
        DELETE FROM public.anexos a
        WHERE a.tenant_id = $1::uuid
          AND (
            a.processo_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.processos p
              WHERE p.id = a.processo_id AND p.modulo = 'saude.tfd'
            )
          )
      `)

      await exec(`
        DELETE FROM public.processos
        WHERE tenant_id = $1::uuid AND modulo = 'saude.tfd'
      `)

      await tx.$executeRawUnsafe(
        `
        UPDATE public.protocolo_sequencias
        SET ultimo_seq = 0, updated_at = NOW()
        WHERE tenant_id = $1::uuid
          AND modulo IN ('SAUDE_TFD', 'SAUDE_TFD-SOL', 'SAUDE_TFD-AGD', 'SAUDE_TFD-VGM')
          AND ano = $2
        `,
        TENANT_ID,
        PROTOCOLO_ANO
      )

      console.log('Transação commitada com sucesso.\n')
    })

    console.log('=== VERIFICAÇÃO: tabelas saude_tfd ===')
    let allZero = true
    for (const table of TABLES_TO_VERIFY) {
      const count = await countTfd(prisma, table)
      console.log(`${table}: ${count}`)
      if (count !== 0) {
        allZero = false
      }
    }

    console.log('\n=== VERIFICAÇÃO: public ===')
    const processos = await countPublic(
      prisma,
      'processos_tfd',
      `SELECT COUNT(*)::int AS count FROM public.processos WHERE tenant_id = $1::uuid AND modulo = 'saude.tfd'`
    )
    const tramitacoes = await countPublic(
      prisma,
      'tramitacoes_tfd',
      `SELECT COUNT(*)::int AS count FROM public.tramitacoes t
       JOIN public.processos p ON p.id = t.processo_id
       WHERE p.tenant_id = $1::uuid AND p.modulo = 'saude.tfd'`
    )
    const auditLogs = await countPublic(
      prisma,
      'audit_logs (preservados)',
      `SELECT COUNT(*)::int AS count FROM public.audit_logs WHERE tenant_id = $1::uuid`
    )

    if (processos !== 0 || tramitacoes !== 0) {
      allZero = false
    }

    console.log('\n=== VERIFICAÇÃO: sequenciais ===')
    const seq = await prisma.protocoloSequencia.findMany({
      where: {
        tenant_id: TENANT_ID,
        modulo: { in: ['SAUDE_TFD', 'SAUDE_TFD-SOL', 'SAUDE_TFD-AGD', 'SAUDE_TFD-VGM'] },
        ano: PROTOCOLO_ANO,
      },
      select: { modulo: true, ano: true, ultimo_seq: true },
      orderBy: { modulo: 'asc' },
    })

    let seqOk = seq.length > 0 && seq.every((row) => row.ultimo_seq === 0)
    for (const row of seq) {
      console.log(`${row.modulo} (${row.ano}): ultimo_seq = ${row.ultimo_seq}`)
      if (row.ultimo_seq !== 0) {
        seqOk = false
      }
    }

    console.log('\n=== VERIFICAÇÃO: preservados ===')
    console.log(`saldos: ${await countTfd(prisma, 'saldos')}`)
    console.log(`veiculos: ${await countTfd(prisma, 'veiculos')}`)
    console.log(`motoristas: ${await countTfd(prisma, 'motoristas')}`)
    console.log(`pacientes: ${(await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM saude_base.pacientes WHERE tenant_id = $1::uuid`,
      TENANT_ID
    ))[0]?.count ?? 0}`)

    console.log('\n=== STORAGE TFD ===')
    console.log(`Diretório: ${STORAGE_TFD_DIR}`)
    const storage = removeStorageDir(STORAGE_TFD_DIR)
    if (storage.removed) {
      console.log(`Removidos ${storage.filesRemoved} arquivo(s).`)
    } else {
      console.log('Diretório não existia (nada a remover).')
    }
    console.log(`Existe após limpeza: ${fs.existsSync(STORAGE_TFD_DIR)}`)

    console.log('\n=== RESULTADO ===')
    console.log(`Contagens zeradas: ${allZero ? 'SIM' : 'NÃO'}`)
    console.log(`Sequenciais em 0: ${seqOk ? 'SIM' : 'NÃO'}`)
    console.log(`Storage limpo: ${!fs.existsSync(STORAGE_TFD_DIR) ? 'SIM' : 'NÃO'}`)
    console.log(`Audit logs preservados: ${auditLogs}`)

    if (!allZero || !seqOk || fs.existsSync(STORAGE_TFD_DIR)) {
      process.exit(1)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('ERRO:', error)
  process.exit(1)
})
