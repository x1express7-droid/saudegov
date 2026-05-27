/**
 * Seed parcial — platform_features Sprint 3.5 (processo como raiz + perfil do servidor).
 * Uso: npx ts-node prisma/seeds/sprint-3-5-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint35PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '3.5'
}

export const SPRINT_35_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'lista_processos_tfd',
    descricao: 'Listagem de processos TFD como tela principal do módulo.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'perfil_processo_tfd',
    descricao: 'Perfil do processo TFD com abas de solicitações, agendamentos e histórico.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'multiplas_solicitacoes_por_processo',
    descricao: 'Abrir múltiplas solicitações vinculadas ao mesmo processo TFD.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.abrir_solicitacao',
    sprint: '3.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'perfil_servidor',
    descricao: 'Perfil do servidor com setores, permissões granulares e histórico de ações.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'editar_dados_servidor',
    descricao: 'Edição de nome, telefone e matrícula pelo próprio servidor ou ADMIN.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.5',
  },
] as const satisfies readonly Sprint35PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_35 = SPRINT_35_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint35TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_35_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_35_TFD_PLATFORM_FEATURES.length
}

export async function assertSprint35FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '3.5',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_35] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_35.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 3.5 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint35TfdPlatformFeatures()
  await assertSprint35FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 3.5 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 3.5 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
