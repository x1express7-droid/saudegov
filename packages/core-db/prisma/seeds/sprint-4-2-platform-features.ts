/**
 * Seed parcial — platform_features Sprint 4.2 (agendamento ampliado).
 * Uso: npx ts-node prisma/seeds/sprint-4-2-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint42PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '4.2'
}

export const SPRINT_42_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'agendamento_convenio_tipo_viagem',
    descricao: 'Convênio (SUS/PARTICULAR) e tipo de viagem (IDA/VOLTA/IDA_VOLTA) no agendamento.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.criar_agendamento',
    sprint: '4.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'agendamento_locais_multiplos',
    descricao: 'Locais adicionais por agendamento (prestador, procedimento, horário, observação).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.criar_agendamento',
    sprint: '4.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'agendamento_acompanhantes_multiplos',
    descricao: 'Múltiplos acompanhantes vinculados ao agendamento via junção.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.criar_agendamento',
    sprint: '4.2',
  },
] as const satisfies readonly Sprint42PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_42 = SPRINT_42_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint42TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_42_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_42_TFD_PLATFORM_FEATURES.length
}

export async function assertSprint42FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '4.2',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_42] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_42.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 4.2 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint42TfdPlatformFeatures()
  await assertSprint42FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 4.2 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 4.2 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
