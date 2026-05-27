/**
 * Seed parcial — platform_features Sprint 3.4 (prestação unificada por agendamento).
 * Uso: npx ts-node prisma/seeds/sprint-3-4-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint34PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '3.4'
}

export const SPRINT_34_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'prestacao_unificada_agendamento',
    descricao: 'Prestação de contas unificada por agendamento (todos os segmentos de transporte).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.enviar_prestacao',
    sprint: '3.4',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'despesa_por_segmento_transporte',
    descricao: 'Lançar despesas vinculadas a segmentos de transporte do agendamento.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_despesa',
    sprint: '3.4',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'extrato_por_agendamento',
    descricao: 'Resumo financeiro estimado vs. real por agendamento e segmento.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_saldo',
    sprint: '3.4',
  },
] as const satisfies readonly Sprint34PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_34 = SPRINT_34_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint34TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_34_TFD_PLATFORM_FEATURES) {
    await db.platformFeature.upsert({
      where: {
        sistema_modulo_funcionalidade: {
          sistema: feature.sistema,
          modulo: feature.modulo,
          funcionalidade: feature.funcionalidade,
        },
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
      update: {
        descricao: feature.descricao,
        painel_dev: feature.painel_dev,
        painel_servidor: feature.painel_servidor,
        permissao_chave: feature.permissao_chave,
        sprint: feature.sprint,
        status: 'ativo',
      },
    })
  }

  return SPRINT_34_TFD_PLATFORM_FEATURES.length
}

export async function assertSprint34FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '3.4',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_34] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_34.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 3.4 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint34TfdPlatformFeatures()
  await assertSprint34FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 3.4 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 3.4 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
