/**
 * Validação RLS — schema saude_tfd (Sprint 1.1)
 * Uso: npx ts-node prisma/validate-rls-tfd.ts
 */
import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
type Tx = Prisma.TransactionClient
const MARKER = '__RLS_TEST__'

type TableResult = {
  table: string
  insertBlocked: boolean
  selectIsolated: boolean
  status: 'OK' | 'FALHA'
  error?: string
  crossInsertError?: string
}

/** Papel sem BYPASSRLS — o usuário `postgres` do dev ignora RLS; produção usa papel de app. */
const RLS_TEST_ROLE = 'saudegov_app'

async function ensureRlsTestRole() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RLS_TEST_ROLE}') THEN
        CREATE ROLE ${RLS_TEST_ROLE} NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
      END IF;
    END $$;
  `)
  await prisma.$executeRawUnsafe(`GRANT ${RLS_TEST_ROLE} TO CURRENT_USER`)
  for (const schema of ['public', 'saude_base', 'saude_tfd']) {
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA ${schema} TO ${RLS_TEST_ROLE}`)
    await prisma.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${RLS_TEST_ROLE}`
    )
  }
}

async function asAppRole<T>(fn: () => Promise<T>): Promise<T> {
  await prisma.$executeRawUnsafe(`SET ROLE ${RLS_TEST_ROLE}`)
  try {
    return await fn()
  } finally {
    await prisma.$executeRawUnsafe('RESET ROLE')
  }
}

async function withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', $1, true)`,
      tenantId
    )
    return fn(tx)
  })
}

async function tryInsert(
  tx: Tx,
  sql: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await tx.$executeRawUnsafe(sql)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function countRows(tx: Tx, sql: string): Promise<number> {
  const rows = await tx.$queryRawUnsafe<{ count: bigint }[]>(sql)
  return Number(rows[0]?.count ?? 0)
}

async function main() {
  await ensureRlsTestRole()

  const tenants = await prisma.$queryRawUnsafe<{ id: string; slug: string; name: string }[]>(
    `SELECT id::text, slug, name FROM public.tenants WHERE active = true ORDER BY slug`
  )

  console.log('Tenants ativos:')
  for (const t of tenants) {
    console.log(`  - ${t.slug}: ${t.name} (${t.id})`)
  }

  if (tenants.length < 2) {
    throw new Error('Menos de 2 tenants ativos — esperado campograndems e altamirapa do seed.')
  }

  const tenantA = tenants.find((t) => t.slug === 'campograndems')!
  const tenantB = tenants.find((t) => t.slug === 'altamirapa')!

  const [userA] = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id::text FROM public.users WHERE tenant_id = '${tenantA.id}'::uuid AND role = 'SERVIDOR' LIMIT 1`
  )
  const [userB] = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id::text FROM public.users WHERE tenant_id = '${tenantB.id}'::uuid AND role = 'SERVIDOR' LIMIT 1`
  )
  if (!userA?.id || !userB?.id) throw new Error('Usuários SERVIDOR não encontrados.')

  const pacienteA = '11111111-1111-4111-8111-111111110005'
  const pacienteB = '22222222-2222-4222-8222-222222220004'

  const ids = {
    processoA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
    processoB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001',
    espA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010',
    espB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000010',
    procA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000011',
    procB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000011',
    prestA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000012',
    prestB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000012',
    veicA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000013',
    veicB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000013',
    motA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000014',
    motB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000014',
    saldoA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000015',
    saldoB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000015',
    solA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000016',
    solB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000016',
    resA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000017',
    resB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000017',
    movA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000018',
    movB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000018',
    acmpA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000019',
    acmpB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000019',
    viagA: 'aaaaaaaa-aaaa-4aaa-8aaa-00000000001a',
    viagB: 'bbbbbbbb-bbbb-4bbb-8bbb-00000000001b',
    despA: 'aaaaaaaa-aaaa-4aaa-8aaa-00000000001c',
    despB: 'bbbbbbbb-bbbb-4bbb-8bbb-00000000001c',
    pcA: 'aaaaaaaa-aaaa-4aaa-8aaa-00000000001d',
    pcB: 'bbbbbbbb-bbbb-4bbb-8bbb-00000000001d',
  }

  const results: TableResult[] = []

  // Garante ambiente limpo (falha anterior de cleanup ou reexecução)
  const allIdsList = Object.values({
    processoA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
    processoB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001',
    espA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010',
    espB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000010',
    procA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000011',
    procB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000011',
    prestA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000012',
    prestB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000012',
    veicA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000013',
    veicB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000013',
    motA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000014',
    motB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000014',
    saldoA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000015',
    saldoB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000015',
    solA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000016',
    solB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000016',
    resA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000017',
    resB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000017',
    movA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000018',
    movB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000018',
    acmpA: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000019',
    acmpB: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000019',
    viagA: 'aaaaaaaa-aaaa-4aaa-8aaa-00000000001a',
    viagB: 'bbbbbbbb-bbbb-4bbb-8bbb-00000000001b',
    despA: 'aaaaaaaa-aaaa-4aaa-8aaa-00000000001c',
    despB: 'bbbbbbbb-bbbb-4bbb-8bbb-00000000001c',
    pcA: 'aaaaaaaa-aaaa-4aaa-8aaa-00000000001d',
    pcB: 'bbbbbbbb-bbbb-4bbb-8bbb-00000000001d',
  })
    .map((id) => `'${id}'::uuid`)
    .join(', ')

  const preCleanup = [
    `DELETE FROM saude_tfd.prestacoes_conta WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.itens_despesa WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.viagens WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.acompanhantes WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.movimentacoes_saldo WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.reservas_saldo WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.solicitacoes WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.saldos WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.motoristas WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.veiculos WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.prestadores WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.procedimentos WHERE id IN (${allIdsList})`,
    `DELETE FROM saude_tfd.especialidades WHERE id IN (${allIdsList})`,
    `DELETE FROM public.processos WHERE id IN ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001'::uuid, 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'::uuid)`,
  ]
  await prisma.$executeRawUnsafe(`SET row_security = off`)
  for (const sql of preCleanup) {
    await prisma.$executeRawUnsafe(sql)
  }
  await prisma.$executeRawUnsafe(`SET row_security = on`)

  await asAppRole(async () => {
    await withTenant(tenantA.id, async (tx) => {
      await tx.$executeRawUnsafe(`
        INSERT INTO public.processos (id, tenant_id, protocolo, modulo, titulo)
        VALUES ('${ids.processoA}'::uuid, '${tenantA.id}'::uuid, 'RLS-TEST-A-001', 'saude.tfd', '${MARKER} Processo A')
        ON CONFLICT (id) DO NOTHING
      `)
    })
    await withTenant(tenantB.id, async (tx) => {
      await tx.$executeRawUnsafe(`
        INSERT INTO public.processos (id, tenant_id, protocolo, modulo, titulo)
        VALUES ('${ids.processoB}'::uuid, '${tenantB.id}'::uuid, 'RLS-TEST-B-001', 'saude.tfd', '${MARKER} Processo B')
        ON CONFLICT (id) DO NOTHING
      `)
    })
  })

  async function validate(
    table: string,
    opts: {
      insertA: string
      insertB: string
      insertCross: string
      countSql: string
    }
  ): Promise<TableResult> {
    let insertBlocked = false
    let selectIsolated = false
    let error: string | undefined
    let crossInsertError: string | undefined

    try {
      await asAppRole(async () => {
        await withTenant(tenantA.id, async (tx) => {
          await tx.$executeRawUnsafe(opts.insertA)
        })

        await withTenant(tenantA.id, async (tx) => {
          const cross = await tryInsert(tx, opts.insertCross)
          insertBlocked = !cross.ok
          crossInsertError = cross.error
        })

        let countAsA = 0
        let countAsBBefore = 0
        let countAsBAfter = 0
        let countAsAAfter = 0

        await withTenant(tenantA.id, async (tx) => {
          countAsA = await countRows(tx, opts.countSql)
        })
        await withTenant(tenantB.id, async (tx) => {
          countAsBBefore = await countRows(tx, opts.countSql)
        })
        await withTenant(tenantB.id, async (tx) => {
          await tx.$executeRawUnsafe(opts.insertB)
        })
        await withTenant(tenantB.id, async (tx) => {
          countAsBAfter = await countRows(tx, opts.countSql)
        })
        await withTenant(tenantA.id, async (tx) => {
          countAsAAfter = await countRows(tx, opts.countSql)
        })

        selectIsolated =
          countAsA >= 1 &&
          countAsBBefore === 0 &&
          countAsBAfter >= 1 &&
          countAsAAfter === countAsA
      })
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }

    const status = insertBlocked && selectIsolated && !error ? 'OK' : 'FALHA'
    return { table, insertBlocked, selectIsolated, status, error, crossInsertError }
  }

  const like = `${MARKER}%`

  results.push(
    await validate('especialidades', {
      insertA: `INSERT INTO saude_tfd.especialidades (id, tenant_id, nome) VALUES ('${ids.espA}'::uuid, '${tenantA.id}'::uuid, '${MARKER} Esp A')`,
      insertB: `INSERT INTO saude_tfd.especialidades (id, tenant_id, nome) VALUES ('${ids.espB}'::uuid, '${tenantB.id}'::uuid, '${MARKER} Esp B')`,
      insertCross: `INSERT INTO saude_tfd.especialidades (id, tenant_id, nome) VALUES ('${ids.espB}'::uuid, '${tenantB.id}'::uuid, '${MARKER} Esp cross')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.especialidades WHERE nome LIKE '${like}'`,
    })
  )

  results.push(
    await validate('procedimentos', {
      insertA: `INSERT INTO saude_tfd.procedimentos (id, tenant_id, especialidade_id, nome) VALUES ('${ids.procA}'::uuid, '${tenantA.id}'::uuid, '${ids.espA}'::uuid, '${MARKER} Proc A')`,
      insertB: `INSERT INTO saude_tfd.procedimentos (id, tenant_id, especialidade_id, nome) VALUES ('${ids.procB}'::uuid, '${tenantB.id}'::uuid, '${ids.espB}'::uuid, '${MARKER} Proc B')`,
      insertCross: `INSERT INTO saude_tfd.procedimentos (id, tenant_id, especialidade_id, nome) VALUES ('${ids.procB}'::uuid, '${tenantB.id}'::uuid, '${ids.espA}'::uuid, '${MARKER} Proc cross')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.procedimentos WHERE nome LIKE '${like}'`,
    })
  )

  results.push(
    await validate('prestadores', {
      insertA: `INSERT INTO saude_tfd.prestadores (id, tenant_id, nome, cidade, estado) VALUES ('${ids.prestA}'::uuid, '${tenantA.id}'::uuid, '${MARKER} Prest A', 'Campo Grande', 'MS')`,
      insertB: `INSERT INTO saude_tfd.prestadores (id, tenant_id, nome, cidade, estado) VALUES ('${ids.prestB}'::uuid, '${tenantB.id}'::uuid, '${MARKER} Prest B', 'Altamira', 'PA')`,
      insertCross: `INSERT INTO saude_tfd.prestadores (id, tenant_id, nome, cidade, estado) VALUES ('${ids.prestB}'::uuid, '${tenantB.id}'::uuid, '${MARKER} Prest cross', 'Altamira', 'PA')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.prestadores WHERE nome LIKE '${like}'`,
    })
  )

  results.push(
    await validate('veiculos', {
      insertA: `INSERT INTO saude_tfd.veiculos (id, tenant_id, placa, modelo) VALUES ('${ids.veicA}'::uuid, '${tenantA.id}'::uuid, 'RLS-A01', '${MARKER} Veic A')`,
      insertB: `INSERT INTO saude_tfd.veiculos (id, tenant_id, placa, modelo) VALUES ('${ids.veicB}'::uuid, '${tenantB.id}'::uuid, 'RLS-B01', '${MARKER} Veic B')`,
      insertCross: `INSERT INTO saude_tfd.veiculos (id, tenant_id, placa, modelo) VALUES ('${ids.veicB}'::uuid, '${tenantB.id}'::uuid, 'RLS-X01', '${MARKER} Veic cross')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.veiculos WHERE modelo LIKE '${like}'`,
    })
  )

  results.push(
    await validate('motoristas', {
      insertA: `INSERT INTO saude_tfd.motoristas (id, tenant_id, user_id, cnh, cnh_categoria, cnh_validade) VALUES ('${ids.motA}'::uuid, '${tenantA.id}'::uuid, '${userA.id}'::uuid, 'RLS00001', 'B', '2030-01-01')`,
      insertB: `INSERT INTO saude_tfd.motoristas (id, tenant_id, user_id, cnh, cnh_categoria, cnh_validade) VALUES ('${ids.motB}'::uuid, '${tenantB.id}'::uuid, '${userB.id}'::uuid, 'RLS00002', 'B', '2030-01-01')`,
      insertCross: `INSERT INTO saude_tfd.motoristas (id, tenant_id, user_id, cnh, cnh_categoria, cnh_validade) VALUES ('${ids.motB}'::uuid, '${tenantB.id}'::uuid, '${userA.id}'::uuid, 'RLS00003', 'B', '2030-01-01')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.motoristas WHERE cnh LIKE 'RLS%'`,
    })
  )

  results.push(
    await validate('saldos', {
      insertA: `INSERT INTO saude_tfd.saldos (id, tenant_id, descricao, fonte, valor_total, competencia_inicio, competencia_fim) VALUES ('${ids.saldoA}'::uuid, '${tenantA.id}'::uuid, '${MARKER} Saldo A', 'MUNICIPAL_PROPRIO', 1000, '2025-01-01', '2025-12-31')`,
      insertB: `INSERT INTO saude_tfd.saldos (id, tenant_id, descricao, fonte, valor_total, competencia_inicio, competencia_fim) VALUES ('${ids.saldoB}'::uuid, '${tenantB.id}'::uuid, '${MARKER} Saldo B', 'MUNICIPAL_PROPRIO', 1000, '2025-01-01', '2025-12-31')`,
      insertCross: `INSERT INTO saude_tfd.saldos (id, tenant_id, descricao, fonte, valor_total, competencia_inicio, competencia_fim) VALUES ('${ids.saldoB}'::uuid, '${tenantB.id}'::uuid, '${MARKER} Saldo cross', 'MUNICIPAL_PROPRIO', 1000, '2025-01-01', '2025-12-31')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.saldos WHERE descricao LIKE '${like}'`,
    })
  )

  results.push(
    await validate('solicitacoes', {
      insertA: `INSERT INTO saude_tfd.solicitacoes (id, tenant_id, processo_id, paciente_id, solicitante_id, tipo_atendimento) VALUES ('${ids.solA}'::uuid, '${tenantA.id}'::uuid, '${ids.processoA}'::uuid, '${pacienteA}'::uuid, '${userA.id}'::uuid, 'CONSULTA')`,
      insertB: `INSERT INTO saude_tfd.solicitacoes (id, tenant_id, processo_id, paciente_id, solicitante_id, tipo_atendimento) VALUES ('${ids.solB}'::uuid, '${tenantB.id}'::uuid, '${ids.processoB}'::uuid, '${pacienteB}'::uuid, '${userB.id}'::uuid, 'CONSULTA')`,
      insertCross: `INSERT INTO saude_tfd.solicitacoes (id, tenant_id, processo_id, paciente_id, solicitante_id, tipo_atendimento) VALUES ('${ids.solB}'::uuid, '${tenantB.id}'::uuid, '${ids.processoA}'::uuid, '${pacienteA}'::uuid, '${userA.id}'::uuid, 'CONSULTA')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.solicitacoes WHERE id IN ('${ids.solA}'::uuid, '${ids.solB}'::uuid)`,
    })
  )

  results.push(
    await validate('reservas_saldo', {
      insertA: `INSERT INTO saude_tfd.reservas_saldo (id, tenant_id, saldo_id, solicitacao_id, valor_estimado) VALUES ('${ids.resA}'::uuid, '${tenantA.id}'::uuid, '${ids.saldoA}'::uuid, '${ids.solA}'::uuid, 100)`,
      insertB: `INSERT INTO saude_tfd.reservas_saldo (id, tenant_id, saldo_id, solicitacao_id, valor_estimado) VALUES ('${ids.resB}'::uuid, '${tenantB.id}'::uuid, '${ids.saldoB}'::uuid, '${ids.solB}'::uuid, 100)`,
      insertCross: `INSERT INTO saude_tfd.reservas_saldo (id, tenant_id, saldo_id, solicitacao_id, valor_estimado) VALUES ('${ids.resB}'::uuid, '${tenantB.id}'::uuid, '${ids.saldoA}'::uuid, '${ids.solA}'::uuid, 100)`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.reservas_saldo WHERE id IN ('${ids.resA}'::uuid, '${ids.resB}'::uuid)`,
    })
  )

  results.push(
    await validate('movimentacoes_saldo', {
      insertA: `INSERT INTO saude_tfd.movimentacoes_saldo (id, tenant_id, saldo_id, tipo, valor, descricao, usuario_id) VALUES ('${ids.movA}'::uuid, '${tenantA.id}'::uuid, '${ids.saldoA}'::uuid, 'CREDITO', 1000, '${MARKER} Mov A', '${userA.id}'::uuid)`,
      insertB: `INSERT INTO saude_tfd.movimentacoes_saldo (id, tenant_id, saldo_id, tipo, valor, descricao, usuario_id) VALUES ('${ids.movB}'::uuid, '${tenantB.id}'::uuid, '${ids.saldoB}'::uuid, 'CREDITO', 1000, '${MARKER} Mov B', '${userB.id}'::uuid)`,
      insertCross: `INSERT INTO saude_tfd.movimentacoes_saldo (id, tenant_id, saldo_id, tipo, valor, descricao, usuario_id) VALUES ('${ids.movB}'::uuid, '${tenantB.id}'::uuid, '${ids.saldoA}'::uuid, 'CREDITO', 1000, '${MARKER} Mov cross', '${userA.id}'::uuid)`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.movimentacoes_saldo WHERE descricao LIKE '${like}'`,
    })
  )

  results.push(
    await validate('acompanhantes', {
      insertA: `INSERT INTO saude_tfd.acompanhantes (id, tenant_id, solicitacao_id, nome, cpf, relacao) VALUES ('${ids.acmpA}'::uuid, '${tenantA.id}'::uuid, '${ids.solA}'::uuid, '${MARKER} Acomp A', '11144477735', 'OUTRO')`,
      insertB: `INSERT INTO saude_tfd.acompanhantes (id, tenant_id, solicitacao_id, nome, cpf, relacao) VALUES ('${ids.acmpB}'::uuid, '${tenantB.id}'::uuid, '${ids.solB}'::uuid, '${MARKER} Acomp B', '39053344705', 'OUTRO')`,
      insertCross: `INSERT INTO saude_tfd.acompanhantes (id, tenant_id, solicitacao_id, nome, cpf, relacao) VALUES ('${ids.acmpB}'::uuid, '${tenantB.id}'::uuid, '${ids.solA}'::uuid, '${MARKER} Acomp cross', '39053344705', 'OUTRO')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.acompanhantes WHERE nome LIKE '${like}'`,
    })
  )

  results.push(
    await validate('viagens', {
      insertA: `INSERT INTO saude_tfd.viagens (id, tenant_id, solicitacao_id, data_viagem) VALUES ('${ids.viagA}'::uuid, '${tenantA.id}'::uuid, '${ids.solA}'::uuid, '2026-06-01')`,
      insertB: `INSERT INTO saude_tfd.viagens (id, tenant_id, solicitacao_id, data_viagem) VALUES ('${ids.viagB}'::uuid, '${tenantB.id}'::uuid, '${ids.solB}'::uuid, '2026-06-01')`,
      insertCross: `INSERT INTO saude_tfd.viagens (id, tenant_id, solicitacao_id, data_viagem) VALUES ('${ids.viagB}'::uuid, '${tenantB.id}'::uuid, '${ids.solA}'::uuid, '2026-06-01')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.viagens WHERE id IN ('${ids.viagA}'::uuid, '${ids.viagB}'::uuid)`,
    })
  )

  results.push(
    await validate('itens_despesa', {
      insertA: `INSERT INTO saude_tfd.itens_despesa (id, tenant_id, viagem_id, tipo, valor) VALUES ('${ids.despA}'::uuid, '${tenantA.id}'::uuid, '${ids.viagA}'::uuid, 'TRANSPORTE', 50)`,
      insertB: `INSERT INTO saude_tfd.itens_despesa (id, tenant_id, viagem_id, tipo, valor) VALUES ('${ids.despB}'::uuid, '${tenantB.id}'::uuid, '${ids.viagB}'::uuid, 'TRANSPORTE', 50)`,
      insertCross: `INSERT INTO saude_tfd.itens_despesa (id, tenant_id, viagem_id, tipo, valor) VALUES ('${ids.despB}'::uuid, '${tenantB.id}'::uuid, '${ids.viagA}'::uuid, 'TRANSPORTE', 50)`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.itens_despesa WHERE id IN ('${ids.despA}'::uuid, '${ids.despB}'::uuid)`,
    })
  )

  results.push(
    await validate('prestacoes_conta', {
      insertA: `INSERT INTO saude_tfd.prestacoes_conta (id, tenant_id, viagem_id, prazo_envio_at) VALUES ('${ids.pcA}'::uuid, '${tenantA.id}'::uuid, '${ids.viagA}'::uuid, '2026-06-15')`,
      insertB: `INSERT INTO saude_tfd.prestacoes_conta (id, tenant_id, viagem_id, prazo_envio_at) VALUES ('${ids.pcB}'::uuid, '${tenantB.id}'::uuid, '${ids.viagB}'::uuid, '2026-06-15')`,
      insertCross: `INSERT INTO saude_tfd.prestacoes_conta (id, tenant_id, viagem_id, prazo_envio_at) VALUES ('${ids.pcB}'::uuid, '${tenantB.id}'::uuid, '${ids.viagA}'::uuid, '2026-06-15')`,
      countSql: `SELECT COUNT(*)::bigint AS count FROM saude_tfd.prestacoes_conta WHERE id IN ('${ids.pcA}'::uuid, '${ids.pcB}'::uuid)`,
    })
  )

  // Cleanup (ordem inversa de FKs; conexão Prisma ignora RLS como owner)
  const allIds = Object.values(ids)
    .map((id) => `'${id}'::uuid`)
    .join(', ')

  const cleanupStatements = [
    `DELETE FROM saude_tfd.prestacoes_conta WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.itens_despesa WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.viagens WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.acompanhantes WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.movimentacoes_saldo WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.reservas_saldo WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.solicitacoes WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.saldos WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.motoristas WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.veiculos WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.prestadores WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.procedimentos WHERE id IN (${allIds})`,
    `DELETE FROM saude_tfd.especialidades WHERE id IN (${allIds})`,
    `DELETE FROM public.processos WHERE id IN ('${ids.processoA}'::uuid, '${ids.processoB}'::uuid)`,
  ]
  await prisma.$executeRawUnsafe(`SET row_security = off`)
  for (const sql of cleanupStatements) {
    await prisma.$executeRawUnsafe(sql)
  }
  await prisma.$executeRawUnsafe(`SET row_security = on`)

  console.log('\n## Resultado RLS — schema saude_tfd\n')
  console.log(`Tenant A: ${tenantA.slug} | Tenant B: ${tenantB.slug}`)
  console.log(`Papel de teste: ${RLS_TEST_ROLE} (NOBYPASSRLS — equivalente ao app em produção)\n`)
  console.log('| Tabela | INSERT bloqueado | SELECT isolado | Status |')
  console.log('|--------|------------------|----------------|--------|')
  for (const r of results) {
    console.log(
      `| ${r.table} | ${r.insertBlocked ? 'Sim' : 'Não'} | ${r.selectIsolated ? 'Sim' : 'Não'} | ${r.status} |`
    )
    if (r.status === 'FALHA') {
      if (r.error) console.log(`  - Erro: ${r.error}`)
      if (r.crossInsertError) console.log(`  - INSERT cross-tenant: ${r.crossInsertError}`)
    }
  }

  const failed = results.filter((r) => r.status === 'FALHA')
  if (failed.length > 0) process.exit(1)
  console.log('\n✅ 13/13 tabelas passaram. Dados de teste removidos.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
