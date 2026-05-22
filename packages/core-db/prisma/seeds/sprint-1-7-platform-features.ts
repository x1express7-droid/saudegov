/**
 * Seed parcial — platform_features Sprint 1.7 (prestação de contas TFD).
 * Uso: npx ts-node prisma/seeds/sprint-1-7-platform-features.ts
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint17PlatformFeatureSeed = {
  sistema: 'saude'
  modulo: 'tfd'
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: '1.7'
}

export const SPRINT_17_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'registrar_retorno_viagem',
    descricao:
      'Registro de retorno da viagem TFD (viagem REALIZADA, abertura de prestação com prazo de 10 dias).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_retorno',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'prestacao_conta_automatica',
    descricao:
      'Criação automática de prestação de contas ao registrar retorno, com prazo_envio_at calculado.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_retorno',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'job_lembrete_prestacao_48h',
    descricao:
      'Job agendado (cron) que envia notificação 48h antes do prazo de envio da prestação de contas.',
    painel_dev: false,
    painel_servidor: false,
    permissao_chave: null,
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'alerta_prestacao_prazo',
    descricao:
      'Banner na fila TFD para gestores quando o lembrete de prestação falhou ou o prazo está vencendo.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.ver_dashboard',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'registrar_despesa',
    descricao:
      'Lançamento de itens de despesa na prestação (comprovante obrigatório para valores ≥ R$ 50).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_despesa',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'enviar_prestacao_contas',
    descricao:
      'Envio da prestação de contas para análise do gestor (AGUARDANDO_PC → PC_EM_ANALISE).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.enviar_prestacao',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'listar_prestacoes',
    descricao: 'Listagem de prestações de contas com filtros por status e protocolo.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.aprovar_prestacao',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'visualizar_comprovante_prestacao',
    descricao:
      'Visualização de comprovante na análise da PC (URL pré-assinada 15 min + registro em comprovantes_vistos).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.aprovar_prestacao',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'decidir_prestacao_contas',
    descricao:
      'Aprovação ou rejeição da prestação (consumo/liberação de saldo, bloqueio sem ver todos comprovantes).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.aprovar_prestacao',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'consumir_reserva_prestacao',
    descricao:
      'Consumo da reserva ATIVA na aprovação da PC (SELECT FOR UPDATE, CONSUMO + LIBERACAO se aplicável).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.aprovar_prestacao',
    sprint: '1.7',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'ui_prestacao_detalhe_solicitacao',
    descricao:
      'Ações de retorno, lançamento de despesas e análise da prestação na tela de detalhe da solicitação.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '1.7',
  },
] as const satisfies readonly Sprint17PlatformFeatureSeed[]

const FUNCIONALIDADES_SPRINT_17 = SPRINT_17_TFD_PLATFORM_FEATURES.map(
  (feature) => feature.funcionalidade
)

export async function assertSprint17FeaturesReadyForSeed(): Promise<void> {
  const db = getPrismaAdmin()

  const existentes = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '1.7',
    },
    select: { funcionalidade: true },
  })

  const funcionalidadesExistentes = new Set(existentes.map((row) => row.funcionalidade))
  const faltando = FUNCIONALIDADES_SPRINT_17.filter(
    (funcionalidade) => !funcionalidadesExistentes.has(funcionalidade)
  )

  if (existentes.length > 0 && faltando.length === 0) {
    console.log(
      `ℹ️  platform_features Sprint 1.7: ${existentes.length} registro(s) já presente(s); aplicando upsert idempotente.`
    )
    return
  }

  if (existentes.length > 0 && faltando.length > 0) {
    console.log(
      `ℹ️  platform_features Sprint 1.7: parcial (${existentes.length} existente(s)); inserindo/atualizando: ${faltando.join(', ')}.`
    )
  }
}

export async function seedSprint17TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  await assertSprint17FeaturesReadyForSeed()

  for (const feature of SPRINT_17_TFD_PLATFORM_FEATURES) {
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

  return SPRINT_17_TFD_PLATFORM_FEATURES.length
}

async function main(): Promise<void> {
  const count = await seedSprint17TfdPlatformFeatures()
  console.log(
    `📌 platform_features (Sprint 1.7 TFD): ${count} entradas inseridas/atualizadas (upsert idempotente).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 1.7 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
