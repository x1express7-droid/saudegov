/**
 * Seed parcial — platform_features consolidação Fase 4 (Sprint 4.6).
 * Uso: npx ts-node prisma/seeds/sprint-4-6-platform-features.ts
 *
 * Insere apenas registros inexistentes (ON CONFLICT DO NOTHING via skipDuplicates).
 */
import { getPrismaAdmin } from '../../src/admin-client'

type Sprint46PlatformFeatureSeed = {
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painel_dev: boolean
  painel_servidor: boolean
  permissao_chave: string | null
  sprint: string
}

export const SPRINT_46_TFD_PLATFORM_FEATURES = [
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'combobox_busca_typeahead',
    descricao: 'Combobox com busca por digitação (debounce) no design system.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: null,
    sprint: '4.1',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'agendamento_convenio_tipo_viagem',
    descricao: 'Convênio (SUS/PARTICULAR) e tipo de viagem (IDA/VOLTA/IDA_VOLTA) no agendamento.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.criar_agendamento',
    sprint: '4.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'agendamento_locais_multiplos',
    descricao: 'Locais adicionais por agendamento (prestador, procedimento, horário, observação).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.criar_agendamento',
    sprint: '4.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'agendamento_acompanhantes_multiplos',
    descricao: 'Múltiplos acompanhantes vinculados ao agendamento via junção.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.criar_agendamento',
    sprint: '4.2',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'viagem_nova_entidade',
    descricao: 'Nova entidade Viagem TFD vinculada ao processo com protocolo VGM-AAAA-XXXXXX.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '4.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'viagem_controle_vagas',
    descricao: 'Controle de vagas ao vincular agendamentos como passageiros da viagem.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_viagem',
    sprint: '4.3',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'veiculo_detalhe_historico',
    descricao: 'Detalhe do veículo com KPIs e histórico de viagens TFD.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_frota',
    sprint: '4.4',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'motorista_detalhe_historico',
    descricao: 'Detalhe do motorista com alertas de CNH, KPIs e histórico de viagens.',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.gerenciar_frota',
    sprint: '4.4',
  },
  {
    sistema: 'saude',
    modulo: 'tfd',
    funcionalidade: 'prestacao_contas_viagem',
    descricao: 'Prestação de contas vinculada à viagem nova (criação automática na chegada).',
    painel_dev: false,
    painel_servidor: true,
    permissao_chave: 'saude.tfd.registrar_despesa',
    sprint: '4.5',
  },
] as const satisfies readonly Sprint46PlatformFeatureSeed[]

export async function seedSprint46TfdPlatformFeatures(): Promise<number> {
  const db = getPrismaAdmin()

  const result = await db.platformFeature.createMany({
    data: SPRINT_46_TFD_PLATFORM_FEATURES.map((feature) => ({
      sistema: feature.sistema,
      modulo: feature.modulo,
      funcionalidade: feature.funcionalidade,
      descricao: feature.descricao,
      painel_dev: feature.painel_dev,
      painel_servidor: feature.painel_servidor,
      permissao_chave: feature.permissao_chave,
      sprint: feature.sprint,
      status: 'ativo',
    })),
    skipDuplicates: true,
  })

  return result.count
}

async function main(): Promise<void> {
  const count = await seedSprint46TfdPlatformFeatures()

  console.log(
    `📌 platform_features (Fase 4 / Sprint 4.6): ${count} novas entradas inseridas (duplicatas ignoradas).`
  )
}

const isDirectRun =
  typeof require !== 'undefined' &&
  require.main === module

if (isDirectRun) {
  main()
    .catch((error: unknown) => {
      console.error('❌ Falha no seed Sprint 4.6 platform_features:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPrismaAdmin().$disconnect()
    })
}
