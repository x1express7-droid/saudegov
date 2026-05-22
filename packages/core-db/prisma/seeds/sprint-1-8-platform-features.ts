/**
 * Seed parcial — platform_features Sprint 1.8 (dashboard, cancelamento, relatórios, audit).
 * Uso: npx ts-node prisma/seeds/sprint-1-8-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint18PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '1.8'
}

export const SPRINT_18_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'dashboard_tfd',
    descricao:
      'Dashboard operacional TFD (KPIs, gráfico por status, alertas consolidados e últimas solicitações) — somente painel-servidor.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.ver_dashboard',
    sprint: '1.8',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'cancelar_solicitacao',
    descricao:
      'Cancelamento de solicitação TFD com motivo obrigatório, liberação de reserva e bloqueio após AGENDADO.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.cancelar_processo',
    sprint: '1.8',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'relatorio_competencia',
    descricao:
      'Relatório PDF por competência (mês/ano): totais por status, valores reservado/consumido e protocolos — sem dados clínicos.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '1.8',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'relatorio_paciente',
    descricao:
      'Relatório PDF por paciente: histórico de solicitações (protocolo, especialidade, status, datas) — sem dados clínicos.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.exportar_relatorio',
    sprint: '1.8',
  },
  {
    sistema: 'plataforma',
    modulo: 'auditoria',
    funcionalidade: 'audit_log_filtros_expandidos',
    descricao:
      'Filtros expandidos na página de audit logs do Painel Dev (data, usuário, módulo, ações operacionais) — somente painel-dev.',
    painel_dev: true,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '1.8',
  },
] as const satisfies readonly Sprint18PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_18 = SPRINT_18_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function seedSprint18TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  // Entrada provisória da implementação — substituída por relatorio_competencia + relatorio_paciente
  await db.platformFeature.updateMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      funcionalidade: 'relatorios_pdf_tfd',
    },
    data: {
      status: 'inativo',
      descricao:
        '[Substituído na 1.8] Use relatorio_competencia e relatorio_paciente em platform_features.',
    },
  })

  for (const feature of SPRINT_18_PLATFORM_FEATURES) {
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

  return SPRINT_18_PLATFORM_FEATURES.length
}

export async function assertSprint18FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sprint: '1.8',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_18] },
    },
    select: { funcionalidade: true },
  })

  const faltando = FUNCIONALIDADES_SPRINT_18.filter(
    (nome) => !existentes.some((row) => row.funcionalidade === nome)
  )

  if (faltando.length > 0) {
    throw new Error(
      `Sprint 1.8 incompleta em platform_features. Faltando: ${faltando.join(', ')}`
    )
  }
}

async function main(): Promise<void> {
  const count = await seedSprint18TfdPlatformFeatures()
  await assertSprint18FeaturesReadyForSeed()

  const rows = await getPrismaAdmin().platformFeature.findMany({
    where: { sprint: '1.8' },
    orderBy: [{ sistema: 'asc' }, { modulo: 'asc' }, { funcionalidade: 'asc' }],
    select: {
      sistema: true,
      modulo: true,
      funcionalidade: true,
      painel_dev: true,
      painel_servidor: true,
      status: true,
    },
  })

  console.log(
    `📌 platform_features (Sprint 1.8): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
  console.log(`📋 Total registros sprint=1.8 no banco: ${rows.length}`)
  for (const row of rows) {
    console.log(
      `   • ${row.sistema}/${row.modulo}/${row.funcionalidade} — dev:${row.painel_dev} servidor:${row.painel_servidor} (${row.status})`
    )
  }
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 1.8 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
