/**
 * Smoke RLS — Sprint 1.5 (regulação/decisão + download laudo)
 * Uso: npm run db:validate:rls-sprint-1-5 (em packages/core-db)
 */
import { createHmac } from 'crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { validarUrlAssinada } from '../../core-documents/src/storage'

const prisma = new PrismaClient()
const MARKER = '__RLS_S15__'
const RLS_TEST_ROLE = 'saudegov_app'

type Tx = Prisma.TransactionClient

const IDS = {
  processoA: 'cccccccc-cccc-4ccc-8ccc-000000000001',
  processoB: 'dddddddd-dddd-4ddd-8ddd-000000000001',
  solAEnviado: 'cccccccc-cccc-4ccc-8ccc-000000000010',
  solBEnviado: 'dddddddd-dddd-4ddd-8ddd-000000000010',
  solBAnalise: 'dddddddd-dddd-4ddd-8ddd-000000000011',
  anexoA: 'cccccccc-cccc-4ccc-8ccc-000000000020',
} as const

type TestResult = {
  id: string
  ok: boolean
  detail: string
}

async function ensureRlsTestRole(): Promise<void> {
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

async function cleanup(): Promise<void> {
  const ids = Object.values(IDS)
    .map((id) => `'${id}'::uuid`)
    .join(', ')

  await prisma.$executeRawUnsafe(`SET row_security = off`)
  await prisma.$executeRawUnsafe(
    `DELETE FROM public.tramitacoes WHERE processo_id IN ('${IDS.processoA}'::uuid, '${IDS.processoB}'::uuid)`
  )
  await prisma.$executeRawUnsafe(`DELETE FROM public.anexos WHERE id IN (${ids})`)
  await prisma.$executeRawUnsafe(`DELETE FROM saude_tfd.solicitacoes WHERE id IN (${ids})`)
  await prisma.$executeRawUnsafe(
    `DELETE FROM public.processos WHERE id IN ('${IDS.processoA}'::uuid, '${IDS.processoB}'::uuid)`
  )
  await prisma.$executeRawUnsafe(`SET row_security = on`)
}

async function seedFixtures(
  tenantA: string,
  tenantB: string,
  userA: string,
  userB: string,
  pacienteA: string,
  pacienteB: string
): Promise<void> {
  await cleanup()

  await prisma.$executeRawUnsafe(`SET row_security = off`)

  await prisma.$executeRawUnsafe(`
    INSERT INTO public.processos (id, tenant_id, protocolo, modulo, titulo, status)
    VALUES
      ('${IDS.processoA}'::uuid, '${tenantA}'::uuid, 'RLS-S15-A-001', 'saude.tfd', '${MARKER} A', 'EM_ANDAMENTO'),
      ('${IDS.processoB}'::uuid, '${tenantB}'::uuid, 'RLS-S15-B-001', 'saude.tfd', '${MARKER} B', 'EM_ANDAMENTO')
    ON CONFLICT (id) DO NOTHING
  `)

  await prisma.$executeRawUnsafe(`
    INSERT INTO saude_tfd.solicitacoes (id, tenant_id, processo_id, paciente_id, solicitante_id, tipo_atendimento, status)
    VALUES
      ('${IDS.solAEnviado}'::uuid, '${tenantA}'::uuid, '${IDS.processoA}'::uuid, '${pacienteA}'::uuid, '${userA}'::uuid, 'CONSULTA', 'ENVIADO'),
      ('${IDS.solBEnviado}'::uuid, '${tenantB}'::uuid, '${IDS.processoB}'::uuid, '${pacienteB}'::uuid, '${userB}'::uuid, 'CONSULTA', 'ENVIADO'),
      ('${IDS.solBAnalise}'::uuid, '${tenantB}'::uuid, '${IDS.processoB}'::uuid, '${pacienteB}'::uuid, '${userB}'::uuid, 'CONSULTA', 'EM_ANALISE')
    ON CONFLICT (id) DO NOTHING
  `)

  await prisma.$executeRawUnsafe(`
    INSERT INTO public.anexos (id, tenant_id, uploader_id, nome_original, mime_type, tamanho_bytes, storage_path, confirmado)
    VALUES (
      '${IDS.anexoA}'::uuid,
      '${tenantA}'::uuid,
      '${userA}'::uuid,
      '${MARKER}-laudo.pdf',
      'application/pdf',
      1024,
      'tenants/${tenantA}/anexos/${IDS.anexoA}.pdf',
      true
    )
    ON CONFLICT (id) DO NOTHING
  `)

  await prisma.$executeRawUnsafe(`SET row_security = on`)
}

/** Equivalente a findFirst({ id, tenant_id }) com RLS ativo. */
async function findSolicitacaoAsTenant(
  tenantSessionId: string,
  solicitacaoId: string
): Promise<{ id: string; status: string } | null> {
  return asAppRole(async () =>
    withTenant(tenantSessionId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<{ id: string; status: string }[]>(
        `SELECT id::text, status::text
         FROM saude_tfd.solicitacoes
         WHERE id = '${solicitacaoId}'::uuid
           AND tenant_id = '${tenantSessionId}'::uuid
         LIMIT 1`
      )
      return rows[0] ?? null
    })
  )
}

async function readStatusAdmin(solicitacaoId: string): Promise<string | undefined> {
  const rows = await prisma.$queryRawUnsafe<{ status: string }[]>(
    `SELECT status::text FROM saude_tfd.solicitacoes WHERE id = '${solicitacaoId}'::uuid`
  )
  return rows[0]?.status
}

async function simulateIniciarAnalise(
  tenantA: string,
  solicitacaoIdTenantB: string
): Promise<TestResult> {
  const statusBefore = await readStatusAdmin(solicitacaoIdTenantB)
  const found = await findSolicitacaoAsTenant(tenantA, solicitacaoIdTenantB)
  const statusAfter = await readStatusAdmin(solicitacaoIdTenantB)

  const ok = found === null && statusBefore === 'ENVIADO' && statusAfter === 'ENVIADO'

  return {
    id: 'A — iniciarAnaliseTfd (cross-tenant)',
    ok,
    detail: ok
      ? 'findFirst retornou null; status do tenant B inalterado (ENVIADO).'
      : `found=${found ? found.id : 'null'} statusAntes=${statusBefore} statusDepois=${statusAfter}`,
  }
}

async function simulateDecidir(
  tenantA: string,
  solicitacaoIdTenantB: string
): Promise<TestResult> {
  const found = await findSolicitacaoAsTenant(tenantA, solicitacaoIdTenantB)
  const ok = found === null

  return {
    id: 'B — decidirSolicitacaoTfd (cross-tenant)',
    ok,
    detail: ok
      ? 'Solicitação não encontrada (equivalente a success: false).'
      : `Encontrou registro indevido: ${found?.id}`,
  }
}

async function simulateGetSolicitacao(
  tenantA: string,
  solicitacaoIdTenantB: string
): Promise<TestResult> {
  const found = await findSolicitacaoAsTenant(tenantA, solicitacaoIdTenantB)
  const ok = found === null

  return {
    id: 'C — getSolicitacaoTfd (cross-tenant)',
    ok,
    detail: ok ? 'Retorno null (isolamento OK).' : `Retornou id=${found?.id}`,
  }
}

function getSigningSecret(): string | null {
  const signing = process.env.STORAGE_SIGNING_SECRET?.trim()
  if (signing) {
    return signing
  }
  const auth = process.env.AUTH_SECRET?.trim() ?? process.env.NEXTAUTH_SECRET?.trim()
  return auth || null
}

function signPayloadLikeStorage(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

async function findAnexoAsTenant(
  tenantSessionId: string,
  anexoId: string
): Promise<string | null> {
  return asAppRole(async () =>
    withTenant(tenantSessionId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id::text FROM public.anexos
         WHERE id = '${anexoId}'::uuid AND tenant_id = '${tenantSessionId}'::uuid
         LIMIT 1`
      )
      return rows[0]?.id ?? null
    })
  )
}

async function simulateDownloadCrossTenant(
  tenantA: string,
  tenantB: string,
  anexoId: string
): Promise<TestResult> {
  const secret = getSigningSecret()
  if (!secret) {
    return {
      id: 'D — download laudo (cross-tenant)',
      ok: false,
      detail: 'STORAGE_SIGNING_SECRET ou AUTH_SECRET ausente no ambiente.',
    }
  }

  const anexoVisivelA = await findAnexoAsTenant(tenantA, anexoId)
  const anexoVisivelB = await findAnexoAsTenant(tenantB, anexoId)

  const expiresAtUnix = Math.floor(Date.now() / 1000) + 900
  const payloadA = `download:${tenantA}:${anexoId}:${expiresAtUnix}`
  const sigA = signPayloadLikeStorage(payloadA, secret)

  const validWithTenantA = validarUrlAssinada({
    purpose: 'download',
    tenantId: tenantA,
    anexoId,
    expiresAtUnix,
    signature: sigA,
  })

  const validWithTenantBQuery = validarUrlAssinada({
    purpose: 'download',
    tenantId: tenantB,
    anexoId,
    expiresAtUnix,
    signature: sigA,
  })

  const ok =
    anexoVisivelA === anexoId &&
    anexoVisivelB === null &&
    validWithTenantA &&
    !validWithTenantBQuery

  return {
    id: 'D — download laudo (cross-tenant)',
    ok,
    detail: ok
      ? 'Anexo visível só no tenant A; assinatura válida só com tenant A (403 equivalente com tenant B na query).'
      : `anexoA=${anexoVisivelA} anexoB=${anexoVisivelB} sigA=${validWithTenantA} sigB=${validWithTenantBQuery}`,
  }
}

async function main(): Promise<void> {
  await ensureRlsTestRole()

  const tenants = await prisma.$queryRawUnsafe<{ id: string; slug: string }[]>(
    `SELECT id::text, slug FROM public.tenants WHERE active = true ORDER BY slug`
  )

  const tenantA = tenants.find((t) => t.slug === 'campograndems')
  const tenantB = tenants.find((t) => t.slug === 'altamirapa')

  if (!tenantA || !tenantB) {
    throw new Error('Tenants campograndems e altamirapa são obrigatórios no seed.')
  }

  const [userA] = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id::text FROM public.users WHERE tenant_id = '${tenantA.id}'::uuid AND role = 'GESTOR' LIMIT 1`
  )
  const [userB] = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id::text FROM public.users WHERE tenant_id = '${tenantB.id}'::uuid AND role = 'SERVIDOR' LIMIT 1`
  )

  if (!userA?.id || !userB?.id) {
    throw new Error('Usuários GESTOR (A) e SERVIDOR (B) não encontrados.')
  }

  const pacienteA = '11111111-1111-4111-8111-111111110005'
  const pacienteB = '22222222-2222-4222-8222-222222220004'

  await seedFixtures(tenantA.id, tenantB.id, userA.id, userB.id, pacienteA, pacienteB)

  const results: TestResult[] = [
    await simulateIniciarAnalise(tenantA.id, IDS.solBEnviado),
    await simulateDecidir(tenantA.id, IDS.solBAnalise),
    await simulateGetSolicitacao(tenantA.id, IDS.solBEnviado),
    await simulateDownloadCrossTenant(tenantA.id, tenantB.id, IDS.anexoA),
  ]

  console.log('\n## Smoke RLS — Sprint 1.5\n')
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.id}`)
    console.log(`   ${r.detail}\n`)
  }

  await cleanup()

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    process.exit(1)
  }
  console.log('✅ 4/4 testes passaram.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
