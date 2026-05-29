import { addDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import type { PrismaClient } from '@prisma/client'
import { getPrismaAdmin } from '@saude/core-db'
import { createAuditLog, registrarTramitacao } from '@saude/core-documents'

const MODULO_TFD = 'saude.tfd'
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export interface ProcessarTransicaoAgendamentoErro {
  agendamentoId: string
  mensagem: string
}

export interface ProcessarTransicaoAgendamentoResult {
  processadas: number
  transicionadas: number
  ignoradas: number
  processadosPorViagem: number
  processadosPorData: number
  concluidosPorViagem: number
  erros: ProcessarTransicaoAgendamentoErro[]
}

type AgendamentoTransicaoRow = {
  id: string
  tenant_id: string
  data_consulta: Date
  sequencia: number
  processo_id: string
  tenant: {
    settings: unknown
  }
}

function resolveTenantTimezone(settings: unknown): string {
  if (typeof settings !== 'object' || settings === null) {
    return DEFAULT_TIMEZONE
  }

  const timezone = (settings as Record<string, unknown>).timezone
  return typeof timezone === 'string' && timezone.trim() !== ''
    ? timezone.trim()
    : DEFAULT_TIMEZONE
}

function formatDataConsulta(dataConsulta: Date): string {
  return dataConsulta.toISOString().slice(0, 10)
}

function isDataConsultaChegou(
  dataConsulta: Date,
  timezone: string,
  referencia: Date
): boolean {
  const dataStr = formatDataConsulta(dataConsulta)
  const hojeStr = formatInTimeZone(referencia, timezone, 'yyyy-MM-dd')
  return dataStr <= hojeStr
}

async function transicionarAgendamentoParaEmViagem(
  db: PrismaClient,
  agendamento: AgendamentoTransicaoRow,
  origem: 'job_transicao_agendamento_viagem' | 'job_transicao_agendamento_data'
): Promise<'transicionada' | 'ignorada'> {
  const resultado = await db.$transaction(async (tx) => {
    const locked = await tx.tfdAgendamento.findFirst({
      where: {
        id: agendamento.id,
        tenant_id: agendamento.tenant_id,
        status: 'AGENDADO',
      },
      select: {
        id: true,
        sequencia: true,
        data_consulta: true,
      },
    })

    if (!locked) {
      return { tipo: 'ignorada' as const }
    }

    await tx.tfdAgendamento.update({
      where: { id: locked.id },
      data: { status: 'EM_VIAGEM' },
    })

    return {
      tipo: 'transicionada' as const,
      sequencia: locked.sequencia,
      dataConsultaLabel: formatDataConsulta(locked.data_consulta),
    }
  })

  if (resultado.tipo === 'ignorada') {
    return 'ignorada'
  }

  await createAuditLog({
    tenantId: agendamento.tenant_id,
    userId: null,
    acao: 'UPDATE',
    entidade: 'saude_tfd_agendamento',
    entidadeId: agendamento.id,
    payloadAntes: { status: 'AGENDADO' },
    payloadDepois: {
      status: 'EM_VIAGEM',
      sequencia: resultado.sequencia,
      dataConsulta: resultado.dataConsultaLabel,
      modulo: MODULO_TFD,
      origem,
    },
  })

  return 'transicionada'
}

async function concluirAgendamentoPorViagem(
  db: PrismaClient,
  agendamento: AgendamentoTransicaoRow
): Promise<'concluida' | 'ignorada'> {
  const resultado = await db.$transaction(async (tx) => {
    const locked = await tx.tfdAgendamento.findFirst({
      where: {
        id: agendamento.id,
        tenant_id: agendamento.tenant_id,
        status: 'EM_VIAGEM',
      },
      select: {
        id: true,
        sequencia: true,
        data_consulta: true,
        processo_id: true,
        viagem_passageiros: {
          where: {
            viagem: { status: 'CONCLUIDA' },
          },
          select: {
            viagem: { select: { id: true, protocolo: true } },
          },
          take: 1,
        },
      },
    })

    if (!locked || locked.viagem_passageiros.length === 0) {
      return { tipo: 'ignorada' as const }
    }

    const viagem = locked.viagem_passageiros[0]!.viagem
    const realizadoAt = new Date()
    const dataConsultaLabel = formatDataConsulta(locked.data_consulta)

    await tx.tfdAgendamento.update({
      where: { id: locked.id },
      data: {
        status: 'REALIZADO',
        realizado_at: realizadoAt,
      },
    })

    await registrarTramitacao(
      {
        tenantId: agendamento.tenant_id,
        processoId: locked.processo_id,
        tipo: 'RETORNO_REGISTRADO',
        descricao: `Retorno do agendamento ${locked.sequencia} registrado automaticamente (${dataConsultaLabel}) — viagem ${viagem.protocolo} concluída.`,
        usuarioId: null,
        metadata: {
          agendamentoId: locked.id,
          sequencia: locked.sequencia,
          viagemId: viagem.id,
          origem: 'job_transicao_agendamento_viagem_concluida',
        },
      },
      tx
    )

    return {
      tipo: 'concluida' as const,
      sequencia: locked.sequencia,
      dataConsultaLabel,
      viagemProtocolo: viagem.protocolo,
    }
  })

  if (resultado.tipo === 'ignorada') {
    return 'ignorada'
  }

  await createAuditLog({
    tenantId: agendamento.tenant_id,
    userId: null,
    acao: 'UPDATE',
    entidade: 'saude_tfd_agendamento',
    entidadeId: agendamento.id,
    payloadAntes: { status: 'EM_VIAGEM' },
    payloadDepois: {
      status: 'REALIZADO',
      sequencia: resultado.sequencia,
      dataConsulta: resultado.dataConsultaLabel,
      viagemProtocolo: resultado.viagemProtocolo,
      modulo: MODULO_TFD,
      origem: 'job_transicao_agendamento_viagem_concluida',
    },
  })

  return 'concluida'
}

/**
 * Job cross-tenant: deriva status do agendamento a partir da viagem nova vinculada.
 * Fallback por data_consulta apenas para agendamentos sem viagem_passageiros.
 */
export async function processarTransicaoAgendamento(): Promise<ProcessarTransicaoAgendamentoResult> {
  const db = getPrismaAdmin()
  const agora = new Date()
  const dataLimitePrefiltro = addDays(agora, 1)

  const resumo: ProcessarTransicaoAgendamentoResult = {
    processadas: 0,
    transicionadas: 0,
    ignoradas: 0,
    processadosPorViagem: 0,
    processadosPorData: 0,
    concluidosPorViagem: 0,
    erros: [],
  }

  const candidatosPorViagem = await db.tfdAgendamento.findMany({
    where: {
      status: 'AGENDADO',
      viagem_passageiros: {
        some: {
          viagem: { status: 'EM_ANDAMENTO' },
        },
      },
    },
    select: {
      id: true,
      tenant_id: true,
      data_consulta: true,
      sequencia: true,
      processo_id: true,
      tenant: { select: { settings: true } },
    },
    orderBy: [{ data_consulta: 'asc' }, { sequencia: 'asc' }],
  })

  for (const agendamento of candidatosPorViagem as AgendamentoTransicaoRow[]) {
    resumo.processadas += 1

    try {
      const outcome = await transicionarAgendamentoParaEmViagem(
        db,
        agendamento,
        'job_transicao_agendamento_viagem'
      )

      if (outcome === 'ignorada') {
        resumo.ignoradas += 1
        continue
      }

      resumo.transicionadas += 1
      resumo.processadosPorViagem += 1
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido ao processar agendamento.'
      resumo.erros.push({ agendamentoId: agendamento.id, mensagem })
      console.error('[processarTransicaoAgendamento] Erro (por viagem EM_ANDAMENTO):', {
        agendamentoId: agendamento.id,
        tenantId: agendamento.tenant_id,
        error: mensagem,
      })
    }
  }

  const candidatosConclusao = await db.tfdAgendamento.findMany({
    where: {
      status: 'EM_VIAGEM',
      viagem_passageiros: {
        some: {
          viagem: { status: 'CONCLUIDA' },
        },
      },
    },
    select: {
      id: true,
      tenant_id: true,
      data_consulta: true,
      sequencia: true,
      processo_id: true,
      tenant: { select: { settings: true } },
    },
    orderBy: [{ data_consulta: 'asc' }, { sequencia: 'asc' }],
  })

  for (const agendamento of candidatosConclusao as AgendamentoTransicaoRow[]) {
    resumo.processadas += 1

    try {
      const outcome = await concluirAgendamentoPorViagem(db, agendamento)

      if (outcome === 'ignorada') {
        resumo.ignoradas += 1
        continue
      }

      resumo.concluidosPorViagem += 1
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido ao concluir agendamento.'
      resumo.erros.push({ agendamentoId: agendamento.id, mensagem })
      console.error('[processarTransicaoAgendamento] Erro (conclusão por viagem):', {
        agendamentoId: agendamento.id,
        tenantId: agendamento.tenant_id,
        error: mensagem,
      })
    }
  }

  const candidatosPorData = await db.tfdAgendamento.findMany({
    where: {
      status: 'AGENDADO',
      data_consulta: { lte: dataLimitePrefiltro },
      viagem_passageiros: { none: {} },
    },
    select: {
      id: true,
      tenant_id: true,
      data_consulta: true,
      sequencia: true,
      processo_id: true,
      tenant: { select: { settings: true } },
    },
    orderBy: [{ data_consulta: 'asc' }, { sequencia: 'asc' }],
  })

  for (const agendamento of candidatosPorData as AgendamentoTransicaoRow[]) {
    const timezone = resolveTenantTimezone(agendamento.tenant.settings)

    if (!isDataConsultaChegou(agendamento.data_consulta, timezone, agora)) {
      continue
    }

    resumo.processadas += 1

    try {
      const outcome = await transicionarAgendamentoParaEmViagem(
        db,
        agendamento,
        'job_transicao_agendamento_data'
      )

      if (outcome === 'ignorada') {
        resumo.ignoradas += 1
        continue
      }

      resumo.transicionadas += 1
      resumo.processadosPorData += 1
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido ao processar agendamento.'
      resumo.erros.push({ agendamentoId: agendamento.id, mensagem })
      console.error('[processarTransicaoAgendamento] Erro (fallback por data):', {
        agendamentoId: agendamento.id,
        tenantId: agendamento.tenant_id,
        error: mensagem,
      })
    }
  }

  console.info('[processarTransicaoAgendamento] Resumo:', {
    processadas: resumo.processadas,
    transicionadas: resumo.transicionadas,
    processadosPorViagem: resumo.processadosPorViagem,
    processadosPorData: resumo.processadosPorData,
    concluidosPorViagem: resumo.concluidosPorViagem,
    ignoradas: resumo.ignoradas,
    erros: resumo.erros.length,
  })

  return resumo
}
