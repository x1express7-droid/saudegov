/**
 * Seed parcial — platform_features Sprint 2.4 (notificações por e-mail TFD).
 * Uso: npx ts-node prisma/seeds/sprint-2-4-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint24PlatformFeatureSeed = {
  sistema: 'saude'
  modulo: 'tfd'
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '2.4'
}

export const SPRINT_24_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'canal_email_notificacoes',
    descricao:
      'Canal e-mail em @saude/core-notifications (dispatcher, templates, registro em notificacoes).',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '2.4',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'retry_fila_email',
    descricao:
      'Job processarFilaEmail e cron de retry (15 min, até 3 tentativas) para notificações EMAIL PENDENTE/FALHOU.',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '2.4',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'config_notificacoes_email_tenant',
    descricao:
      'Card Notificações por e-mail em /configuracoes/municipio (toggle email_notifications_enabled e notification_email).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.config.municipio',
    sprint: '2.4',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'config_smtp_custom_tenant',
    descricao:
      'Card SMTP do município em /configuracoes/municipio (smtp_custom_enabled, host, porta, credenciais criptografadas).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.config.municipio',
    sprint: '2.4',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'notificacao_retorno_registrado',
    descricao:
      'Notificação in-app RETORNO_REGISTRADO ao servidor responsável após registro de retorno (viagem ou agendamento).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_retorno',
    sprint: '2.4',
  },
] as const satisfies readonly Sprint24PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_24 = SPRINT_24_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function assertSprint24FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '2.4',
    },
    select: { funcionalidade: true },
  })

  const funcionalidadesExistentes = new Set(existentes.map((row) => row.funcionalidade))
  const faltando = FUNCIONALIDADES_SPRINT_24.filter(
    (funcionalidade) => !funcionalidadesExistentes.has(funcionalidade)
  )

  if (existentes.length > 0 && faltando.length === 0) {
    console.log(
      `ℹ️  platform_features Sprint 2.4: ${existentes.length} registro(s) já presente(s); aplicando upsert idempotente.`
    )
    return
  }

  if (existentes.length > 0 && faltando.length > 0) {
    console.log(
      `ℹ️  platform_features Sprint 2.4: parcial (${existentes.length} existente(s)); inserindo/atualizando: ${faltando.join(', ')}.`
    )
  }
}

export async function seedSprint24TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  await assertSprint24FeaturesReadyForSeed()

  for (const feature of SPRINT_24_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_24_TFD_PLATFORM_FEATURES.length
}

async function main(): Promise<void> {
  const count = await seedSprint24TfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 2.4 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 2.4 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
