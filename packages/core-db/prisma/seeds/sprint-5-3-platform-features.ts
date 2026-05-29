/**
 * Seed parcial — platform_features Fase 5 (Sprint 5.3).
 * Uso: npx ts-node prisma/seeds/sprint-5-3-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint53PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: string
}

export const SPRINT_53_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'fluxo_unico_deslocamento',
    descricao:
      'Fluxo canônico Agendamento → Viagem → Segmentos → PC; agendamento exibe viagem vinculada.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.monitorar_viagem',
    sprint: '5.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'segmentos_dentro_viagem',
    descricao: 'Segmentos de deslocamento (TfdTransporte) vinculados à viagem nova via viagem_id.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '5.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'pc_unificada_viagem',
    descricao:
      'Prestação de contas na viagem com despesas vinculáveis a segmentos (transporte_id).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_despesa',
    sprint: '5.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'legado_somente_leitura',
    descricao:
      'Viagens legadas e segmentos por agendamento em modo histórico — sem criação no fluxo principal.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '5.3',
  },
] as const satisfies readonly Sprint53PlatformFeatureSeed[]

export async function seedSprint53TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  const result = await db.platformFeature.createMany({
    data: SPRINT_53_TFD_PLATFORM_FEATURES.map((feature) => ({
      sistema: feature.sistema,
      modulo: feature.modulo,
      funcionalidade: feature.funcionalidade,
      descricao: feature.descricao,
      painel_dev: feature.painel_dev,
      painel_servidor: feature.painel_servidor,
      permissao_chave: feature.permissao_chave,
      sprint: feature.sprint,
      status: 'ativo',
    })),
    skipDuplicates: true,
  })

  return result.count
}

async function main(): Promise<void> {
  const count = await seedSprint53TfdPlatformFeatures()

  console.log(
    `📌 platform_features (Fase 5 / Sprint 5.3): ${count} novas entradas inseridas (duplicatas ignoradas).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 5.3 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
