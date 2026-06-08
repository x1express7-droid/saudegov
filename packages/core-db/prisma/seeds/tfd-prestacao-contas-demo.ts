import type { PrismaClient } from '@prisma/client'
import { TFD_CATALOGO_SEED_IDS } from './tfd-catalogo-exemplo'
import { TFD_SALDO_SEED_IDS } from './tfd-saldo-exemplo'

/** IDs fixos para upsert idempotente do cenário de prestação de contas (tenant campograndems). */
export const TFD_PRESTACAO_DEMO_IDS = {
  /** Cenário 1 — aguardando lançamento de despesas e envio da PC */
  processoAguardandoPc: '11111111-1111-4111-8111-111111110030',
  solicitacaoAguardandoPc: '11111111-1111-4111-8111-111111110031',
  viagemAguardandoPc: '11111111-1111-4111-8111-111111110032',
  prestacaoAguardandoPc: '11111111-1111-4111-8111-111111110033',
  reservaAguardandoPc: '11111111-1111-4111-8111-111111110034',
  movReservaAguardandoPc: '11111111-1111-4111-8111-111111110035',
  /** Cenário 2 — PC enviada, aguardando análise do gestor */
  processoEmAnalise: '11111111-1111-4111-8111-111111110040',
  solicitacaoEmAnalise: '11111111-1111-4111-8111-111111110041',
  viagemEmAnalise: '11111111-1111-4111-8111-111111110042',
  prestacaoEmAnalise: '11111111-1111-4111-8111-111111110043',
  reservaEmAnalise: '11111111-1111-4111-8111-111111110044',
  movReservaEmAnalise: '11111111-1111-4111-8111-111111110045',
  despesaEmAnalise: '11111111-1111-4111-8111-111111110046',
} as const

const PROTOCOLOS = {
  processoAguardandoPc: 'TFD-PC-DEMO-0001',
  solicitacaoAguardandoPc: 'TFD-SOL-PC-DEMO-0001',
  viagemAguardandoPc: 'TFD-VGM-PC-DEMO-0001',
  processoEmAnalise: 'TFD-PC-DEMO-0002',
  solicitacaoEmAnalise: 'TFD-SOL-PC-DEMO-0002',
  viagemEmAnalise: 'TFD-VGM-PC-DEMO-0002',
} as const

const VALOR_RESERVA = 1_500
const PRAZO_PRESTACAO_DIAS = 10

function parseDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

/** Réplica simplificada de calcPrazoEnvioPrestacao (prazos.ts) para o seed. */
function calcPrazoEnvioPrestacao(dataViagem: Date): Date {
  const year = dataViagem.getUTCFullYear()
  const month = dataViagem.getUTCMonth()
  const day = dataViagem.getUTCDate()
  const prazo = new Date(Date.UTC(year, month, day + PRAZO_PRESTACAO_DIAS, 23, 59, 59, 999))
  return prazo
}

type SeedPrestacaoParams = {
  tenantId: string
  pacienteId: string
  setorId: string
  unidadeId: string
  servidorId: string
  gestorId: string
}

async function seedCenarioAguardandoPc(
  prisma: PrismaClient,
  params: SeedPrestacaoParams
): Promise<void> {
  const dataViagem = parseDateOnly('2026-05-15')
  const retornoRegistradoAt = new Date('2026-05-16T14:30:00.000Z')
  const prazoEnvioAt = calcPrazoEnvioPrestacao(dataViagem)
  const decididoAt = new Date('2026-05-01T10:00:00.000Z')

  const processo = await prisma.processo.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.processoAguardandoPc },
    update: {
      protocolo: PROTOCOLOS.processoAguardandoPc,
      modulo: 'saude.tfd',
      status: 'EM_ANDAMENTO',
      titulo: 'TFD — Cardiologia (demo prestação de contas)',
      setor_id: params.setorId,
      paciente_id: params.pacienteId,
      aberto_por_id: params.servidorId,
      responsavel_id: params.servidorId,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.processoAguardandoPc,
      tenant_id: params.tenantId,
      protocolo: PROTOCOLOS.processoAguardandoPc,
      modulo: 'saude.tfd',
      status: 'EM_ANDAMENTO',
      titulo: 'TFD — Cardiologia (demo prestação de contas)',
      setor_id: params.setorId,
      paciente_id: params.pacienteId,
      aberto_por_id: params.servidorId,
      responsavel_id: params.servidorId,
    },
  })

  await prisma.tfdSolicitacao.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc },
    update: {
      processo_id: processo.id,
      protocolo: PROTOCOLOS.solicitacaoAguardandoPc,
      paciente_id: params.pacienteId,
      solicitante_id: params.servidorId,
      unidade_origem_id: params.unidadeId,
      especialidade_id: TFD_CATALOGO_SEED_IDS.especialidadeCardiologia,
      prestador_id: TFD_CATALOGO_SEED_IDS.prestadorHospital,
      procedimentos: [
        {
          id: TFD_CATALOGO_SEED_IDS.procedimentoConsulta,
          nome: 'Consulta em cardiologia',
        },
      ],
      tipo_atendimento: 'CONSULTA',
      urgencia: 'INTERMEDIARIA',
      status: 'AGUARDANDO_PC',
      cid_principal: 'I10',
      diagnostico: 'Hipertensão arterial — acompanhamento especializado (dados fictícios).',
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      decidido_por_id: params.gestorId,
      decidido_at: decididoAt,
      fundamentacao_decisao: 'Solicitação aprovada para TFD — seed de desenvolvimento.',
      modalidade_tfd: 'INTERMUNICIPAL',
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc,
      tenant_id: params.tenantId,
      processo_id: processo.id,
      protocolo: PROTOCOLOS.solicitacaoAguardandoPc,
      paciente_id: params.pacienteId,
      solicitante_id: params.servidorId,
      unidade_origem_id: params.unidadeId,
      especialidade_id: TFD_CATALOGO_SEED_IDS.especialidadeCardiologia,
      prestador_id: TFD_CATALOGO_SEED_IDS.prestadorHospital,
      procedimentos: [
        {
          id: TFD_CATALOGO_SEED_IDS.procedimentoConsulta,
          nome: 'Consulta em cardiologia',
        },
      ],
      tipo_atendimento: 'CONSULTA',
      urgencia: 'INTERMEDIARIA',
      status: 'AGUARDANDO_PC',
      cid_principal: 'I10',
      diagnostico: 'Hipertensão arterial — acompanhamento especializado (dados fictícios).',
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      decidido_por_id: params.gestorId,
      decidido_at: decididoAt,
      fundamentacao_decisao: 'Solicitação aprovada para TFD — seed de desenvolvimento.',
      modalidade_tfd: 'INTERMUNICIPAL',
    },
  })

  await prisma.tfdReservaSaldo.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.reservaAguardandoPc },
    update: {
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc,
      valor_estimado: VALOR_RESERVA,
      status: 'ATIVA',
      consumido_at: null,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.reservaAguardandoPc,
      tenant_id: params.tenantId,
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc,
      valor_estimado: VALOR_RESERVA,
      status: 'ATIVA',
    },
  })

  await prisma.tfdMovimentacaoSaldo.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.movReservaAguardandoPc },
    update: {
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      tipo: 'RESERVA',
      valor: VALOR_RESERVA,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc,
      descricao: `Reserva — solicitação ${PROTOCOLOS.solicitacaoAguardandoPc} (seed PC)`,
      usuario_id: params.gestorId,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.movReservaAguardandoPc,
      tenant_id: params.tenantId,
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      tipo: 'RESERVA',
      valor: VALOR_RESERVA,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc,
      descricao: `Reserva — solicitação ${PROTOCOLOS.solicitacaoAguardandoPc} (seed PC)`,
      usuario_id: params.gestorId,
    },
  })

  await prisma.tfdViagemLegado.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.viagemAguardandoPc },
    update: {
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc,
      protocolo: PROTOCOLOS.viagemAguardandoPc,
      sequencia: 1,
      data_viagem: dataViagem,
      status: 'REALIZADA',
      retorno_registrado_at: retornoRegistradoAt,
      observacoes: 'Viagem realizada — seed para teste de prestação de contas.',
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.viagemAguardandoPc,
      tenant_id: params.tenantId,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc,
      protocolo: PROTOCOLOS.viagemAguardandoPc,
      sequencia: 1,
      data_viagem: dataViagem,
      status: 'REALIZADA',
      retorno_registrado_at: retornoRegistradoAt,
      observacoes: 'Viagem realizada — seed para teste de prestação de contas.',
    },
  })

  await prisma.tfdPrestacaoConta.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.prestacaoAguardandoPc },
    update: {
      viagem_id: TFD_PRESTACAO_DEMO_IDS.viagemAguardandoPc,
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      status: 'PENDENTE',
      prazo_envio_at: prazoEnvioAt,
      comprovantes_vistos: [],
      observacoes_gestor: null,
      aprovado_por_id: null,
      aprovado_at: null,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.prestacaoAguardandoPc,
      tenant_id: params.tenantId,
      viagem_id: TFD_PRESTACAO_DEMO_IDS.viagemAguardandoPc,
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      status: 'PENDENTE',
      prazo_envio_at: prazoEnvioAt,
      comprovantes_vistos: [],
    },
  })
}

async function seedCenarioEmAnalise(
  prisma: PrismaClient,
  params: SeedPrestacaoParams
): Promise<void> {
  const dataViagem = parseDateOnly('2026-05-10')
  const retornoRegistradoAt = new Date('2026-05-11T16:00:00.000Z')
  const prazoEnvioAt = calcPrazoEnvioPrestacao(dataViagem)
  const decididoAt = new Date('2026-04-28T09:00:00.000Z')

  const processo = await prisma.processo.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.processoEmAnalise },
    update: {
      protocolo: PROTOCOLOS.processoEmAnalise,
      modulo: 'saude.tfd',
      status: 'EM_ANDAMENTO',
      titulo: 'TFD — Cardiologia (PC em análise — demo)',
      setor_id: params.setorId,
      paciente_id: params.pacienteId,
      aberto_por_id: params.servidorId,
      responsavel_id: params.servidorId,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.processoEmAnalise,
      tenant_id: params.tenantId,
      protocolo: PROTOCOLOS.processoEmAnalise,
      modulo: 'saude.tfd',
      status: 'EM_ANDAMENTO',
      titulo: 'TFD — Cardiologia (PC em análise — demo)',
      setor_id: params.setorId,
      paciente_id: params.pacienteId,
      aberto_por_id: params.servidorId,
      responsavel_id: params.servidorId,
    },
  })

  await prisma.tfdSolicitacao.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise },
    update: {
      processo_id: processo.id,
      protocolo: PROTOCOLOS.solicitacaoEmAnalise,
      paciente_id: params.pacienteId,
      solicitante_id: params.servidorId,
      unidade_origem_id: params.unidadeId,
      especialidade_id: TFD_CATALOGO_SEED_IDS.especialidadeCardiologia,
      prestador_id: TFD_CATALOGO_SEED_IDS.prestadorHospital,
      procedimentos: [
        {
          id: TFD_CATALOGO_SEED_IDS.procedimentoConsulta,
          nome: 'Consulta em cardiologia',
        },
      ],
      tipo_atendimento: 'CONSULTA',
      urgencia: 'BAIXA',
      status: 'PC_EM_ANALISE',
      cid_principal: 'I10',
      diagnostico: 'Hipertensão arterial — PC enviada para análise (dados fictícios).',
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      decidido_por_id: params.gestorId,
      decidido_at: decididoAt,
      fundamentacao_decisao: 'Solicitação aprovada — seed PC em análise.',
      modalidade_tfd: 'INTERMUNICIPAL',
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise,
      tenant_id: params.tenantId,
      processo_id: processo.id,
      protocolo: PROTOCOLOS.solicitacaoEmAnalise,
      paciente_id: params.pacienteId,
      solicitante_id: params.servidorId,
      unidade_origem_id: params.unidadeId,
      especialidade_id: TFD_CATALOGO_SEED_IDS.especialidadeCardiologia,
      prestador_id: TFD_CATALOGO_SEED_IDS.prestadorHospital,
      procedimentos: [
        {
          id: TFD_CATALOGO_SEED_IDS.procedimentoConsulta,
          nome: 'Consulta em cardiologia',
        },
      ],
      tipo_atendimento: 'CONSULTA',
      urgencia: 'BAIXA',
      status: 'PC_EM_ANALISE',
      cid_principal: 'I10',
      diagnostico: 'Hipertensão arterial — PC enviada para análise (dados fictícios).',
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      decidido_por_id: params.gestorId,
      decidido_at: decididoAt,
      fundamentacao_decisao: 'Solicitação aprovada — seed PC em análise.',
      modalidade_tfd: 'INTERMUNICIPAL',
    },
  })

  await prisma.tfdReservaSaldo.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.reservaEmAnalise },
    update: {
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise,
      valor_estimado: VALOR_RESERVA,
      status: 'ATIVA',
      consumido_at: null,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.reservaEmAnalise,
      tenant_id: params.tenantId,
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise,
      valor_estimado: VALOR_RESERVA,
      status: 'ATIVA',
    },
  })

  await prisma.tfdMovimentacaoSaldo.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.movReservaEmAnalise },
    update: {
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      tipo: 'RESERVA',
      valor: VALOR_RESERVA,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise,
      descricao: `Reserva — solicitação ${PROTOCOLOS.solicitacaoEmAnalise} (seed PC)`,
      usuario_id: params.gestorId,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.movReservaEmAnalise,
      tenant_id: params.tenantId,
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      tipo: 'RESERVA',
      valor: VALOR_RESERVA,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise,
      descricao: `Reserva — solicitação ${PROTOCOLOS.solicitacaoEmAnalise} (seed PC)`,
      usuario_id: params.gestorId,
    },
  })

  await prisma.tfdViagemLegado.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.viagemEmAnalise },
    update: {
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise,
      protocolo: PROTOCOLOS.viagemEmAnalise,
      sequencia: 1,
      data_viagem: dataViagem,
      status: 'REALIZADA',
      retorno_registrado_at: retornoRegistradoAt,
      observacoes: 'Viagem realizada — PC já enviada (seed).',
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.viagemEmAnalise,
      tenant_id: params.tenantId,
      solicitacao_id: TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise,
      protocolo: PROTOCOLOS.viagemEmAnalise,
      sequencia: 1,
      data_viagem: dataViagem,
      status: 'REALIZADA',
      retorno_registrado_at: retornoRegistradoAt,
      observacoes: 'Viagem realizada — PC já enviada (seed).',
    },
  })

  await prisma.tfdPrestacaoConta.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.prestacaoEmAnalise },
    update: {
      viagem_id: TFD_PRESTACAO_DEMO_IDS.viagemEmAnalise,
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      status: 'ENVIADA',
      prazo_envio_at: prazoEnvioAt,
      comprovantes_vistos: [],
      observacoes_gestor: null,
      aprovado_por_id: null,
      aprovado_at: null,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.prestacaoEmAnalise,
      tenant_id: params.tenantId,
      viagem_id: TFD_PRESTACAO_DEMO_IDS.viagemEmAnalise,
      saldo_id: TFD_SALDO_SEED_IDS.saldo,
      status: 'ENVIADA',
      prazo_envio_at: prazoEnvioAt,
      comprovantes_vistos: [],
    },
  })

  await prisma.tfdItemDespesa.upsert({
    where: { id: TFD_PRESTACAO_DEMO_IDS.despesaEmAnalise },
    update: {
      viagem_id: TFD_PRESTACAO_DEMO_IDS.viagemEmAnalise,
      tipo: 'ALIMENTACAO',
      descricao: 'Lanche durante deslocamento (seed — valor abaixo de R$ 50)',
      valor: 35,
      responsavel_pagamento: 'MUNICIPIO',
      comprovante_anexo_id: null,
    },
    create: {
      id: TFD_PRESTACAO_DEMO_IDS.despesaEmAnalise,
      tenant_id: params.tenantId,
      viagem_id: TFD_PRESTACAO_DEMO_IDS.viagemEmAnalise,
      tipo: 'ALIMENTACAO',
      descricao: 'Lanche durante deslocamento (seed — valor abaixo de R$ 50)',
      valor: 35,
      responsavel_pagamento: 'MUNICIPIO',
    },
  })
}

export type TfdPrestacaoDemoResult = {
  urls: {
    aguardandoPc: string
    emAnalise: string
    gestaoCentral: string
  }
  protocolos: typeof PROTOCOLOS
}

/**
 * Cenários completos para testar prestação de contas TFD (fluxo legado por viagem).
 * Cenário 1: AGUARDANDO_PC + PC PENDENTE — servidor lança despesas e envia.
 * Cenário 2: PC_EM_ANALISE + PC ENVIADA — gestor aprova ou rejeita.
 */
export async function seedTfdPrestacaoContasDemo(
  prisma: PrismaClient,
  params: SeedPrestacaoParams
): Promise<TfdPrestacaoDemoResult> {
  await seedCenarioAguardandoPc(prisma, params)
  await seedCenarioEmAnalise(prisma, params)

  return {
    urls: {
      aguardandoPc: `/saude/tfd/${TFD_PRESTACAO_DEMO_IDS.solicitacaoAguardandoPc}`,
      emAnalise: `/saude/tfd/${TFD_PRESTACAO_DEMO_IDS.solicitacaoEmAnalise}`,
      gestaoCentral: '/saude/tfd/gestao',
    },
    protocolos: PROTOCOLOS,
  }
}
