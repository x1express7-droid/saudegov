/**
 * Seed parcial — platform_features Sprint 3.1 (dados clínicos, fila, perfil paciente).
 * Uso: npx ts-node prisma/seeds/sprint-3-1-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint31PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '3.1'
}

export const SPRINT_31_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_dados_clinicos',
    descricao: 'Tabela saude_tfd.processo_dados_clinicos (dados SOAP por processo).',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_fila_movimentacoes',
    descricao: 'Tabela saude_tfd.fila_movimentacoes (histórico imutável de posição na fila).',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '3.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'registrar_dados_clinicos',
    descricao: 'Registrar ou atualizar dados clínicos SOAP do processo TFD.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_dados_clinicos',
    sprint: '3.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'perfil_paciente_tfd',
    descricao:
      'Perfil completo do paciente com histórico de processos e agendamentos (sem dados clínicos sensíveis em listagens).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.ver_perfil_paciente',
    sprint: '3.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'mover_paciente_fila',
    descricao:
      'Alterar posição do paciente na fila de regulação com justificativa auditada (GESTOR).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.mover_fila',
    sprint: '3.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'posicao_fila_solicitacao',
    descricao:
      'Posição na fila de regulação atribuída automaticamente na abertura e registrada em fila_movimentacoes.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '3.1',
  },
] as const satisfies readonly Sprint31PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_31 = SPRINT_31_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint31TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_31_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_31_TFD_PLATFORM_FEATURES.length
}

export async function assertSprint31FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '3.1',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_31] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_31.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 3.1 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint31TfdPlatformFeatures()
  await assertSprint31FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 3.1 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 3.1 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
