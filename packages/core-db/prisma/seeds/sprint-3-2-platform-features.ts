/**
 * Seed parcial — platform_features Sprint 3.2 (entidade agendamentos).
 * Uso: npx ts-node prisma/seeds/sprint-3-2-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint32PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '3.2'
}

export const SPRINT_32_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_agendamentos',
    descricao: 'Tabela saude_tfd.agendamentos (consulta agendada) e enum agendamento_status.',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'criar_agendamento_entidade',
    descricao: 'Criar agendamento de consulta/atendimento no processo TFD (entidade própria).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.criar_agendamento',
    sprint: '3.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'detalhe_agendamento',
    descricao: 'Consultar detalhe do agendamento TFD (entidade agendamentos).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'registrar_retorno_agendamento',
    descricao: 'Registrar retorno do agendamento e abrir prestação de contas vinculada.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_retorno',
    sprint: '3.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'cancelar_agendamento',
    descricao: 'Cancelar agendamento antes de entrar em viagem (GESTOR).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.cancelar_processo',
    sprint: '3.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'job_transicao_agendamento_em_viagem',
    descricao:
      'Job cron: transição automática AGENDADO → EM_VIAGEM na data da consulta (agendamentos).',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.2',
  },
] as const satisfies readonly Sprint32PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_32 = SPRINT_32_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint32TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_32_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_32_TFD_PLATFORM_FEATURES.length
}

export async function assertSprint32FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '3.2',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_32] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_32.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 3.2 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint32TfdPlatformFeatures()
  await assertSprint32FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 3.2 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 3.2 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
