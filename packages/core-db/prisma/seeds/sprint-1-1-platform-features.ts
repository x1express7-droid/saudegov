/**
 * Seed parcial — platform_features Sprint 1.1 (módulo TFD).
 * Uso: npx ts-node prisma/seeds/sprint-1-1-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint11PlatformFeatureSeed = {
  sistema: 'saude'
  modulo: 'tfd'
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '1.1'
}

export const SPRINT_11_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_config',
    descricao: 'Tabelas especialidades, procedimentos, prestadores',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_frota',
    descricao: 'Tabelas veiculos, motoristas',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_saldos',
    descricao: 'Tabelas saldos, reservas_saldo, movimentacoes_saldo',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_solicitacoes',
    descricao: 'Tabelas solicitacoes, acompanhantes',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'schema_tfd_viagens',
    descricao: 'Tabelas viagens, itens_despesa, prestacoes_conta',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'configurar_especialidades',
    descricao: 'CRUD de especialidades TFD',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.configurar_especialidades',
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'configurar_procedimentos',
    descricao: 'CRUD de procedimentos TFD',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.configurar_procedimentos',
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'configurar_prestadores',
    descricao: 'CRUD de prestadores externos TFD',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.configurar_prestadores',
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'gerenciar_veiculos',
    descricao: 'CRUD de veículos da frota TFD',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_frota',
    sprint: '1.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'gerenciar_motoristas',
    descricao: 'CRUD de motoristas com alerta de CNH',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_frota',
    sprint: '1.1',
  },
] as const satisfies readonly Sprint11PlatformFeatureSeed[]

export async function seedSprint11TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_11_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_11_TFD_PLATFORM_FEATURES.length
}

async function printParidadeTfd(): Promise<void> {
  const db = getPrismaAdmin()
  const rows = await db.platformFeature.findMany({
    where: { modulo: 'tfd' },
    orderBy: { funcionalidade: 'asc' },
    select: {
      funcionalidade: true,
      painel_dev: true,
      painel_servidor: true,
      status: true,
      sprint: true,
      permissao_chave: true,
    },
  })

  console.log('\n--- Paridade TFD (cursorrules §6) ---')
  console.log(
    'funcionalidade'.padEnd(28),
    'painel_dev',
    'painel_servidor',
    'status',
    'sprint'
  )
  for (const row of rows) {
    console.log(
      row.funcionalidade.padEnd(28),
      String(row.painel_dev).padEnd(10),
      String(row.painel_servidor).padEnd(16),
      row.status.padEnd(8),
      row.sprint ?? '-'
    )
  }

  const lacunas = rows.filter(
    (row) => row.painel_dev !== row.painel_servidor && row.status === 'ativo'
  )
  if (lacunas.length > 0) {
    console.log('\n⚠️ Funcionalidades ativas com painéis assimétricos:')
    for (const row of lacunas) {
      const faltando = row.painel_dev ? 'painel_servidor' : 'painel_dev'
      console.log(`  - ${row.funcionalidade}: falta equivalente em ${faltando}`)
    }
  } else {
    console.log('\n✓ Nenhuma lacuna de paridade (dev/servidor iguais por linha ativa).')
  }
}

async function main(): Promise<void> {
  const count = await seedSprint11TfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 1.1 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
  await printParidadeTfd()
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 1.1 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
