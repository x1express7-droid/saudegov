/**
 * Seed parcial — platform_features Sprint 1.2 (gestão financeira TFD).
 * Uso: npx ts-node prisma/seeds/sprint-1-2-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint12PlatformFeatureSeed = {
  sistema: 'saude'
  modulo: 'tfd'
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string
  sprint: '1.2'
}

export const SPRINT_12_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'criar_saldo',
    descricao:
      'Cadastro de saldo financeiro TFD (fonte, competência e valor total) com movimentação CREDITO automática.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_saldo',
    sprint: '1.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'listar_saldos',
    descricao:
      'Listagem de saldos financeiros com cálculo de disponível, percentual e alerta visual abaixo de 20%.',
    painel_dev: true,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_saldo',
    sprint: '1.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'extrato_saldo',
    descricao:
      'Extrato paginado de movimentações financeiras por saldo (crédito, reserva, consumo, liberação, estorno).',
    painel_dev: true,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_saldo',
    sprint: '1.2',
  },
] as const satisfies readonly Sprint12PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_12 = SPRINT_12_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

/** Evita duplicar registros fora do upsert por chave (sistema, modulo, funcionalidade). */
export async function assertSprint12FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '1.2',
    },
    select: { funcionalidade: true },
  })

  const funcionalidadesExistentes = new Set(existentes.map((row) => row.funcionalidade))
  const faltando = FUNCIONALIDADES_SPRINT_12.filter(
    (funcionalidade) => !funcionalidadesExistentes.has(funcionalidade)
  )

  if (existentes.length > 0 && faltando.length === 0) {
    console.log(
      `ℹ️  platform_features Sprint 1.2: ${existentes.length} registro(s) já presente(s); aplicando upsert idempotente.`
    )
    return
  }

  if (existentes.length > 0 && faltando.length > 0) {
    console.log(
      `ℹ️  platform_features Sprint 1.2: parcial (${existentes.length} existente(s)); inserindo/atualizando: ${faltando.join(', ')}.`
    )
  }
}

export async function seedSprint12TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  await assertSprint12FeaturesReadyForSeed()

  for (const feature of SPRINT_12_TFD_PLATFORM_FEATURES) {
    await db.platformFeature.upsert({
      where: {
        sistema_modulo_funcionalidade: {
          sistema: feature.sistema,
          modulo: feature.modulo,
          funcionalidade: feature.funcionalidade,
        },
      },
      update: {
        descricao: feature.descricao,
        painel_dev: feature.painel_dev,
        painel_servidor: feature.painel_servidor,
        permissao_chave: feature.permissao_chave,
        sprint: feature.sprint,
        status: 'ativo',
      },
      create: {
        sistema: feature.sistema,
        modulo: feature.modulo,
        funcionalidade: feature.funcionalidade,
        descricao: feature.descricao,
        painel_dev: feature.painel_dev,
        painel_servidor: feature.painel_servidor,
        permissao_chave: feature.permissao_chave,
        sprint: feature.sprint,
        status: 'ativo',
      },
    })
  }

  return SPRINT_12_TFD_PLATFORM_FEATURES.length
}

async function printParidadeTfdSprint12(): Promise<void> {
  const db = getPrismaAdmin()
  const rows = await db.platformFeature.findMany({
    where: { modulo: 'tfd', sprint: '1.2' },
    orderBy: { funcionalidade: 'asc' },
    select: {
      funcionalidade: true,
      painel_dev: true,
      painel_servidor: true,
      status: true,
      sprint: true,
    },
  })

  console.log('\n--- Paridade TFD Sprint 1.2 (cursorrules §6) ---')
  console.log(
    'funcionalidade'.padEnd(20),
    'painel_dev',
    'painel_servidor',
    'status',
    'sprint'
  )
  for (const row of rows) {
    console.log(
      row.funcionalidade.padEnd(20),
      String(row.painel_dev).padEnd(10),
      String(row.painel_servidor).padEnd(16),
      row.status.padEnd(8),
      row.sprint ?? '-'
    )
  }

  const esperado: Record<string, { dev: boolean; servidor: boolean }> = {
    criar_saldo: { dev: false, servidor: true },
    listar_saldos: { dev: true, servidor: true },
    extrato_saldo: { dev: true, servidor: true },
  }

  for (const [funcionalidade, flags] of Object.entries(esperado)) {
    const row = rows.find((item) => item.funcionalidade === funcionalidade)
    if (!row) {
      console.log(`\n⚠️ Funcionalidade ausente: ${funcionalidade}`)
      continue
    }
    if (row.painel_dev !== flags.dev || row.painel_servidor !== flags.servidor) {
      console.log(
        `\n⚠️ Paridade divergente em ${funcionalidade}: esperado dev=${flags.dev} servidor=${flags.servidor}, obtido dev=${row.painel_dev} servidor=${row.painel_servidor}`
      )
    }
  }
}

async function main(): Promise<void> {
  const count = await seedSprint12TfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 1.2 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
  await printParidadeTfdSprint12()
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 1.2 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
