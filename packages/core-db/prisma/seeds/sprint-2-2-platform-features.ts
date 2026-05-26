/**
 * Seed parcial — platform_features Sprint 2.2 (financeiro TFD: nav, inativação de saldo).
 * Uso: npx ts-node prisma/seeds/sprint-2-2-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint22PlatformFeatureSeed = {
  sistema: 'saude'
  modulo: 'tfd'
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string
  sprint: '2.2'
}

export const SPRINT_22_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'nav_financeiro_tfd',
    descricao:
      'Submenu Financeiro no nav lateral TFD (saldos, prestações de contas, relatórios) filtrado por permissão.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_saldo',
    sprint: '2.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'dashboard_financeiro_tfd',
    descricao:
      'Bloco Financeiro no dashboard gestor TFD: KPI consolidado, alertas de saldo baixo e extrato resumido.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.ver_dashboard',
    sprint: '2.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'notificacao_saldo_baixo',
    descricao:
      'Notificação in-app SALDO_BAIXO para gestores com ver_dashboard quando disponível cai abaixo de 20%.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.ver_dashboard',
    sprint: '2.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'desativar_saldo',
    descricao:
      'Inativação de saldo financeiro TFD (ativo = false) preservando extrato e movimentações.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_saldo',
    sprint: '2.2',
  },
] as const satisfies readonly Sprint22PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_22 = SPRINT_22_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function assertSprint22FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '2.2',
    },
    select: { funcionalidade: true },
  })

  const funcionalidadesExistentes = new Set(existentes.map((row) => row.funcionalidade))
  const faltando = FUNCIONALIDADES_SPRINT_22.filter(
    (funcionalidade) => !funcionalidadesExistentes.has(funcionalidade)
  )

  if (existentes.length > 0 && faltando.length === 0) {
    console.log(
      `ℹ️  platform_features Sprint 2.2: ${existentes.length} registro(s) já presente(s); aplicando upsert idempotente.`
    )
    return
  }

  if (existentes.length > 0 && faltando.length > 0) {
    console.log(
      `ℹ️  platform_features Sprint 2.2: parcial (${existentes.length} existente(s)); inserindo/atualizando: ${faltando.join(', ')}.`
    )
  }
}

export async function seedSprint22TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  await assertSprint22FeaturesReadyForSeed()

  for (const feature of SPRINT_22_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_22_TFD_PLATFORM_FEATURES.length
}

async function main(): Promise<void> {
  const count = await seedSprint22TfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 2.2 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 2.2 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
