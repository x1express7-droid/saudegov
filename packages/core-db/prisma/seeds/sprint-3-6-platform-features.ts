/**
 * Seed parcial — platform_features Sprint 3.6 (limpeza e consolidação Fase 3).
 * Uso: npm run db:seed:sprint-3-6-cleanup
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint36PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '3.6'
}

export const SPRINT_36_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'deprecar_tabela_viagens',
    descricao: 'Coluna deprecated_at em saude_tfd.viagens — tabela legada mantida para histórico.',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.6',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'listagem_agendamentos_unificada',
    descricao:
      'Listagem de agendamentos unificando viagens legadas (TfdViagem) e agendamentos novos (TfdAgendamento).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.6',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'filtro_protocolo_processos',
    descricao: 'Filtro por protocolo do processo na listagem principal (/saude/tfd/processos).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.6',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'verificacao_fase_3_completa',
    descricao: 'Script de verificação das platform_features das sprints 3.1 a 3.6.',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.6',
  },
] as const satisfies readonly Sprint36PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_36 = SPRINT_36_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint36TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_36_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_36_TFD_PLATFORM_FEATURES.length
}

export async function assertSprint36FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '3.6',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_36] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_36.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 3.6 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint36TfdPlatformFeatures()
  await assertSprint36FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 3.6 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 3.6 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
