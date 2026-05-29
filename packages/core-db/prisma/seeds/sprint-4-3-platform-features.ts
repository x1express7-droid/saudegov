/**
 * Seed parcial — platform_features Sprint 4.3 (nova entidade viagem).
 * Uso: npx ts-node prisma/seeds/sprint-4-3-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint43PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '4.3'
}

export const SPRINT_43_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'criar_viagem',
    descricao: 'Criar viagem TFD vinculada ao processo com protocolo próprio.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '4.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'vincular_agendamento_viagem',
    descricao: 'Vincular agendamentos como passageiros da viagem com controle de vagas.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '4.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'desvincular_passageiro_viagem',
    descricao: 'Remover passageiro de viagem planejada ou confirmada.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '4.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'mudar_status_viagem',
    descricao: 'Transições de status da viagem (planejada → confirmada → em andamento → concluída).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '4.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'registrar_chegada_viagem',
    descricao: 'Registrar chegada, km e custo real — conclui a viagem.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '4.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'cancelar_viagem',
    descricao: 'Cancelar viagem planejada ou confirmada com motivo obrigatório.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '4.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'job_transicao_viagem_nova',
    descricao: 'Job automático CONFIRMADA → EM_ANDAMENTO na data/hora de saída.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '4.3',
  },
] as const satisfies readonly Sprint43PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_43 = SPRINT_43_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint43TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_43_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_43_TFD_PLATFORM_FEATURES.length
}

export async function assertSprint43FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '4.3',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_43] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_43.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 4.3 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint43TfdPlatformFeatures()
  await assertSprint43FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 4.3 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 4.3 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
