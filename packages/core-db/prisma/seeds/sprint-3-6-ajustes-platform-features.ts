/**
 * Seed parcial — platform_features Sprint 3.6 ajustes (reclassificação de urgência).
 * Uso: npx ts-node prisma/seeds/sprint-3-6-ajustes-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint36AjustesPlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '3.6-ajustes'
}

export const SPRINT_36_AJUSTES_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'reclassificar_urgencia_solicitacao',
    descricao:
      'Reclassificar urgência da solicitação (BAIXA/INTERMEDIARIA/GRAVE) com tramitação',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.decidir_solicitacao',
    sprint: '3.6-ajustes',
  },
] as const satisfies readonly Sprint36AjustesPlatformFeatureSeed[]

export async function seedSprint36AjustesTfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_36_AJUSTES_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_36_AJUSTES_TFD_PLATFORM_FEATURES.length
}

async function main(): Promise<void> {
  const count = await seedSprint36AjustesTfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 3.6 ajustes TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 3.6 ajustes platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
