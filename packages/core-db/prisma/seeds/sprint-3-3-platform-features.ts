/**
 * Seed parcial — platform_features Sprint 3.3 (transportes por agendamento).
 * Uso: npx ts-node prisma/seeds/sprint-3-3-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint33PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '3.3'
}

export const SPRINT_33_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_transportes',
    descricao: 'Tabelas saude_tfd.transportes e enums de segmento/status de transporte.',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_transporte_anexos',
    descricao: 'Tabela saude_tfd.transporte_anexos (anexos por segmento de transporte).',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'criar_segmento_transporte',
    descricao: 'Criar segmento de transporte vinculado a um agendamento TFD.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_transporte',
    sprint: '3.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'confirmar_transporte',
    descricao: 'Confirmar segmento de transporte (PENDENTE → CONFIRMADO).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_transporte',
    sprint: '3.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'registrar_chegada_transporte',
    descricao: 'Registrar chegada do segmento de transporte (→ CONCLUIDO).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_transporte',
    sprint: '3.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'cancelar_transporte',
    descricao: 'Cancelar segmento de transporte antes de entrar em trânsito.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_transporte',
    sprint: '3.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'anexo_segmento_transporte',
    descricao: 'Anexar comprovante ou documento a um segmento de transporte.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_transporte',
    sprint: '3.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'job_transicao_transporte_em_transito',
    descricao:
      'Job cron: transição automática CONFIRMADO → EM_TRANSITO na data/hora de saída do segmento.',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'visualizacao_rota_completa',
    descricao: 'Visualizar rota completa com múltiplos segmentos no detalhe do agendamento.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.3',
  },
] as const satisfies readonly Sprint33PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_33 = SPRINT_33_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint33TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_33_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_33_TFD_PLATFORM_FEATURES.length
}

export async function assertSprint33FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '3.3',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_33] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_33.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 3.3 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint33TfdPlatformFeatures()
  await assertSprint33FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 3.3 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 3.3 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
