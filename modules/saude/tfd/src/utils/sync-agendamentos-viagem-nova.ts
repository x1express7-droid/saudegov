import type { Prisma } from '@prisma/client'
import { registrarTramitacao } from '@saude/core-documents'

export interface AgendamentoViagemNovaSyncItem {
  id: string
  sequencia: number
  processo_id: string
  data_consulta: Date
}

function deduplicarAgendamentos(
  rows: Array<{ agendamento: AgendamentoViagemNovaSyncItem }>
): AgendamentoViagemNovaSyncItem[] {
  const map = new Map<string, AgendamentoViagemNovaSyncItem>()
  for (const row of rows) {
    map.set(row.agendamento.id, row.agendamento)
  }
  return [...map.values()]
}

export async function transicionarAgendamentosParaEmViagemNaViagem(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string
    viagemId: string
  }
): Promise<AgendamentoViagemNovaSyncItem[]> {
  const passageiros = await tx.tfdViagemPassageiro.findMany({
    where: {
      tenant_id: params.tenantId,
      viagem_id: params.viagemId,
      agendamento: { status: 'AGENDADO' },
    },
    select: {
      agendamento: {
        select: {
          id: true,
          sequencia: true,
          processo_id: true,
          data_consulta: true,
        },
      },
    },
  })

  const agendamentos = deduplicarAgendamentos(passageiros)

  for (const agendamento of agendamentos) {
    await tx.tfdAgendamento.update({
      where: { id: agendamento.id },
      data: { status: 'EM_VIAGEM' },
    })
  }

  return agendamentos
}

export async function transicionarAgendamentosParaRealizadoNaViagem(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string
    viagemId: string
    viagemProtocolo: string
    usuarioId: string | null
    origem: string
  }
): Promise<AgendamentoViagemNovaSyncItem[]> {
  const passageiros = await tx.tfdViagemPassageiro.findMany({
    where: {
      tenant_id: params.tenantId,
      viagem_id: params.viagemId,
      agendamento: { status: 'EM_VIAGEM' },
    },
    select: {
      agendamento: {
        select: {
          id: true,
          sequencia: true,
          processo_id: true,
          data_consulta: true,
        },
      },
    },
  })

  const agendamentos = deduplicarAgendamentos(passageiros)
  const realizadoAt = new Date()

  for (const agendamento of agendamentos) {
    await tx.tfdAgendamento.update({
      where: { id: agendamento.id },
      data: {
        status: 'REALIZADO',
        realizado_at: realizadoAt,
      },
    })

    const dataConsultaLabel = agendamento.data_consulta.toISOString().slice(0, 10)

    await registrarTramitacao(
      {
        tenantId: params.tenantId,
        processoId: agendamento.processo_id,
        tipo: 'RETORNO_REGISTRADO',
        descricao: `Retorno do agendamento ${agendamento.sequencia} registrado automaticamente (${dataConsultaLabel}) — viagem ${params.viagemProtocolo}.`,
        usuarioId: params.usuarioId,
        metadata: {
          agendamentoId: agendamento.id,
          sequencia: agendamento.sequencia,
          viagemId: params.viagemId,
          origem: params.origem,
        },
      },
      tx
    )
  }

  return agendamentos
}
