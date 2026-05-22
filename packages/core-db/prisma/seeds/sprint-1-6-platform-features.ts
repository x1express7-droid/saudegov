/**
 * Seed parcial — platform_features Sprint 1.6 (agendamento de viagem TFD).
 * Uso: npx ts-node prisma/seeds/sprint-1-6-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint16PlatformFeatureSeed = {
  sistema: 'saude'
  modulo: 'tfd'
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '1.6'
}

export const SPRINT_16_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'criar_agendamento',
    descricao:
      'Registro de viagem TFD (motorista, veículo, data/hora) com validação de 72h, CNH e capacidade do veículo.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.agendar_viagem',
    sprint: '1.6',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'listar_agendamentos',
    descricao: 'Listagem de viagens agendadas com filtros por período, motorista e veículo.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.agendar_viagem',
    sprint: '1.6',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'filtro_motorista_cnh_viagem',
    descricao:
      'Seleção de motoristas elegíveis na data da viagem (CNH válida na data de referência).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.agendar_viagem',
    sprint: '1.6',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'multiplas_viagens',
    descricao:
      'Registro de viagens adicionais em solicitação já agendada (status permanece AGENDADO).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.agendar_viagem',
    sprint: '1.6',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'job_lembrete_viagem_48h',
    descricao:
      'Job agendado (cron) que envia notificação de lembrete 48h antes da viagem TFD.',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '1.6',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'alerta_lembrete_viagem',
    descricao:
      'Banner na fila TFD para gestores quando o envio automático do lembrete 48h falhou.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.ver_dashboard',
    sprint: '1.6',
  },
] as const satisfies readonly Sprint16PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_16 = SPRINT_16_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function assertSprint16FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '1.6',
    },
    select: { funcionalidade: true },
  })

  const funcionalidadesExistentes = new Set(existentes.map((row) => row.funcionalidade))
  const faltando = FUNCIONALIDADES_SPRINT_16.filter(
    (funcionalidade) => !funcionalidadesExistentes.has(funcionalidade)
  )

  if (existentes.length > 0 && faltando.length === 0) {
    console.log(
      `ℹ️  platform_features Sprint 1.6: ${existentes.length} registro(s) já presente(s); aplicando upsert idempotente.`
    )
    return
  }

  if (existentes.length > 0 && faltando.length > 0) {
    console.log(
      `ℹ️  platform_features Sprint 1.6: parcial (${existentes.length} existente(s)); inserindo/atualizando: ${faltando.join(', ')}.`
    )
  }
}

export async function seedSprint16TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  await assertSprint16FeaturesReadyForSeed()

  for (const feature of SPRINT_16_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_16_TFD_PLATFORM_FEATURES.length
}

async function main(): Promise<void> {
  const count = await seedSprint16TfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 1.6 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 1.6 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
