/**
 * Seed parcial — platform_features Sprint 1.5 (regulação e decisão TFD).
 * Uso: npx ts-node prisma/seeds/sprint-1-5-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint15PlatformFeatureSeed = {
  sistema: 'saude'
  modulo: 'tfd'
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '1.5'
}

export const SPRINT_15_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'iniciar_analise',
    descricao: 'Iniciar análise de solicitação TFD (ENVIADO → EM_ANALISE).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.analisar_laudo',
    sprint: '1.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'detalhe_solicitacao',
    descricao: 'Tela de detalhe da solicitação TFD com tramitações e ações por status.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '1.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'visualizar_laudo',
    descricao:
      'Visualização de laudo médico via URL pré-assinada (15 min) com auditoria READ_SENSITIVE.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.analisar_laudo',
    sprint: '1.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'solicitar_complemento',
    descricao: 'Solicitar complemento de informações ao solicitante (EM_ANALISE → PENDENTE).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.solicitar_complemento',
    sprint: '1.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'enviar_complemento',
    descricao: 'Envio de complemento pelo solicitante (PENDENTE → EM_ANALISE).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '1.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'decidir_solicitacao',
    descricao: 'Aprovação ou negativa de solicitação TFD com fundamentação obrigatória.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.decidir_solicitacao',
    sprint: '1.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'reservar_saldo_aprovacao',
    descricao:
      'Reserva automática de saldo financeiro na aprovação (SELECT FOR UPDATE + movimentação RESERVA).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.decidir_solicitacao',
    sprint: '1.5',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'alerta_pendente_30_dias',
    descricao:
      'Alerta na fila TFD para solicitações PENDENTE com complemento solicitado há mais de 30 dias.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.ver_dashboard',
    sprint: '1.5',
  },
] as const satisfies readonly Sprint15PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_15 = SPRINT_15_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function assertSprint15FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '1.5',
    },
    select: { funcionalidade: true },
  })

  const funcionalidadesExistentes = new Set(existentes.map((row) => row.funcionalidade))
  const faltando = FUNCIONALIDADES_SPRINT_15.filter(
    (funcionalidade) => !funcionalidadesExistentes.has(funcionalidade)
  )

  if (existentes.length > 0 && faltando.length === 0) {
    console.log(
      `ℹ️  platform_features Sprint 1.5: ${existentes.length} registro(s) já presente(s); aplicando upsert idempotente.`
    )
    return
  }

  if (existentes.length > 0 && faltando.length > 0) {
    console.log(
      `ℹ️  platform_features Sprint 1.5: parcial (${existentes.length} existente(s)); inserindo/atualizando: ${faltando.join(', ')}.`
    )
  }
}

export async function seedSprint15TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  await assertSprint15FeaturesReadyForSeed()

  for (const feature of SPRINT_15_TFD_PLATFORM_FEATURES) {
    await db.platformFeature.upsert({
      where: {
        sistema_modulo_funcionalidade: {
          sistema: feature.sistema,
          modulo: feature.modulo,
          funcionalidade: feature.funcionalidade,
        },
      },
      update: {
        descricao: feature.descricao,
        painel_dev: feature.painel_dev,
        painel_servidor: feature.painel_servidor,
        permissao_chave: feature.permissao_chave,
        sprint: feature.sprint,
        status: 'ativo',
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
    })
  }

  return SPRINT_15_TFD_PLATFORM_FEATURES.length
}

async function main(): Promise<void> {
  const count = await seedSprint15TfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 1.5 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 1.5 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
