/**
 * Seed parcial — platform_features Sprint 2.1 (exportação CSV e relatórios TFD).
 * Uso: npx ts-node prisma/seeds/sprint-2-1-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint21PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '2.1'
}

export const SPRINT_21_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'exportar_extrato_csv',
    descricao:
      'Exportação CSV do extrato financeiro completo por saldo e período, com auditoria EXPORT no download (não na leitura paginada).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_saldo',
    sprint: '2.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'relatorio_prestador',
    descricao:
      'Relatório PDF por prestador (volume e gastos no período) — sem dados clínicos.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '2.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'relatorio_motorista',
    descricao:
      'Relatório PDF por motorista (viagens e custos no período) — sem dados clínicos do paciente.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '2.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'relatorio_producao_mensal',
    descricao:
      'Relatório PDF de produção mensal (aprovadas, negadas, concluídas, canceladas com valores).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '2.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'export_csv_fila',
    descricao:
      'Exportação CSV da fila de solicitações TFD com filtros ativos (sem dados clínicos).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '2.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'export_csv_agendamentos',
    descricao:
      'Exportação CSV de agendamentos/viagens TFD com filtros ativos (sem dados clínicos do paciente).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '2.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'export_csv_prestacoes',
    descricao:
      'Exportação CSV de prestações de contas TFD com filtros ativos.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '2.1',
  },
  {
    sistema: 'plataforma',
    modulo: 'municipios',
    funcionalidade: 'exportar_dados_municipio',
    descricao:
      'Exportação completa dos dados de um município (JSON ou CSV) pelo Painel Dev — exclusivo SUPERADMIN.',
    painel_dev: true,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '2.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'export_csv_saldos',
    descricao:
      'Exportação CSV da lista de saldos financeiros TFD (fonte, competência e valores).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '2.1',
  },
] as const satisfies readonly Sprint21PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_21 = SPRINT_21_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint21TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  for (const feature of SPRINT_21_PLATFORM_FEATURES) {
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

  return SPRINT_21_PLATFORM_FEATURES.length
}

export async function assertSprint21FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sprint: '2.1',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_21] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_21.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 2.1 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint21TfdPlatformFeatures()
  await assertSprint21FeaturesReadyForSeed()

  console.log(
    `📌 platform_features (Sprint 2.1): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 2.1 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
