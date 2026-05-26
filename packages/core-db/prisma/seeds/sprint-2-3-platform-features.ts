/**
 * Seed parcial — platform_features Sprint 2.3 (regras operacionais TFD).
 * Uso: npx ts-node prisma/seeds/sprint-2-3-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint23PlatformFeatureSeed = {
  sistema: 'saude'
  modulo: 'tfd'
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string
  sprint: '2.3'
}

export const SPRINT_23_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'estornar_movimentacao_saldo',
    descricao:
      'Estorno de movimentação no extrato do saldo com justificativa obrigatória (tipo ESTORNO, imutabilidade preservada).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_saldo',
    sprint: '2.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'cancelar_pendente_60_dias',
    descricao:
      'Cancelamento de solicitação PENDENTE há 60 dias ou mais sem retorno do complemento, com preset "prazo esgotado".',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.cancelar_processo',
    sprint: '2.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'job_transicao_em_viagem',
    descricao:
      'Job cron: na data da viagem (timezone do tenant), transição automática AGENDADO → EM_VIAGEM com idempotência por viagem.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.ver_dashboard',
    sprint: '2.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'validacao_vedacoes_decisao',
    descricao:
      'Validação de vedações Portaria 55/1999 na aprovação (PAB, distância mínima 50 km, flags subjetivas com confirmação).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.decidir_solicitacao',
    sprint: '2.3',
  },
] as const satisfies readonly Sprint23PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_23 = SPRINT_23_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function assertSprint23FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '2.3',
    },
    select: { funcionalidade: true },
  })

  const funcionalidadesExistentes = new Set(existentes.map((row) => row.funcionalidade))
  const faltando = FUNCIONALIDADES_SPRINT_23.filter(
    (funcionalidade) => !funcionalidadesExistentes.has(funcionalidade)
  )

  if (existentes.length > 0 && faltando.length === 0) {
    console.log(
      `ℹ️  platform_features Sprint 2.3: ${existentes.length} registro(s) já presente(s); aplicando upsert idempotente.`
    )
    return
  }

  if (existentes.length > 0 && faltando.length > 0) {
    console.log(
      `ℹ️  platform_features Sprint 2.3: parcial (${existentes.length} existente(s)); inserindo/atualizando: ${faltando.join(', ')}.`
    )
  }
}

export async function seedSprint23TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  await assertSprint23FeaturesReadyForSeed()

  for (const feature of SPRINT_23_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_23_TFD_PLATFORM_FEATURES.length
}

async function main(): Promise<void> {
  const count = await seedSprint23TfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 2.3 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 2.3 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
