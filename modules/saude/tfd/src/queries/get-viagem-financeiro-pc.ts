import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { TfdCustoPlanejadoItem } from '../types/tfd.types'
import {
  extrairCustoPlanejadoIdDaDescricao,
  limparDescricaoItemPc,
} from '../utils/map-tipo-despesa-pc'

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export interface ViagemFinanceiroPcPassageiroItem {
  passageiroId: string
  agendamentoId: string
  solicitacaoId: string
  protocoloSolicitacao: string
  pacienteNome: string
  custosPlanejados: TfdCustoPlanejadoItem[]
  valorEstimado: number
  reservaAtiva: { valor: number } | null
  itensPc: Array<{
    id: string
    tipo: string
    valor: number
    descricao: string | null
    comprovanteAnexoId: string | null
    custoPlanejadoId: string | null
    createdAt: string
  }>
  valorLancadoPc: number
  custosPendentesImportacao: number
}

export interface ViagemFinanceiroPcOutput {
  viagemId: string
  viagemConcluida: boolean
  totais: {
    estimadoSolicitacoes: number
    reservadoSolicitacoes: number
    lancadoPc: number
    pendenteEstimado: number
  }
  adiantamentoSugerido: number
  passageiros: ViagemFinanceiroPcPassageiroItem[]
  itensPcSemPassageiro: ViagemFinanceiroPcPassageiroItem['itensPc']
}

export async function getViagemFinanceiroPc(
  viagemId: string
): Promise<ViagemFinanceiroPcOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const viagem = await db.tfdViagem.findFirst({
    where: { id: viagemId, tenant_id: tenantId },
    select: {
      id: true,
      status: true,
      passageiros: {
        select: {
          id: true,
          agendamento_id: true,
          agendamento: {
            select: {
              id: true,
              solicitacao: {
                select: {
                  id: true,
                  protocolo: true,
                  paciente: { select: { nome: true } },
                  reservas: {
                    where: { status: 'ATIVA' },
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: { valor_estimado: true },
                  },
                  custos_planejados: {
                    orderBy: { created_at: 'asc' },
                    select: {
                      id: true,
                      tipo: true,
                      descricao: true,
                      quantidade_dias: true,
                      valor: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ agendamento: { data_consulta: 'asc' } }],
      },
    },
  })

  if (!viagem) {
    return null
  }

  const itensPcRows = await db.tfdItemDespesa.findMany({
    where: {
      tenant_id: tenantId,
      viagem_nova_id: viagemId,
    },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      tipo: true,
      valor: true,
      descricao: true,
      comprovante_anexo_id: true,
      agendamento_id: true,
      created_at: true,
    },
  })

  const itensPorAgendamento = new Map<string, ViagemFinanceiroPcPassageiroItem['itensPc']>()
  const itensSemPassageiro: ViagemFinanceiroPcPassageiroItem['itensPc'] = []

  for (const item of itensPcRows) {
    const mapped = {
      id: item.id,
      tipo: item.tipo,
      valor: Number(item.valor),
      descricao: limparDescricaoItemPc(item.descricao),
      comprovanteAnexoId: item.comprovante_anexo_id,
      custoPlanejadoId: extrairCustoPlanejadoIdDaDescricao(item.descricao),
      createdAt: item.created_at.toISOString(),
    }

    if (item.agendamento_id) {
      const lista = itensPorAgendamento.get(item.agendamento_id) ?? []
      lista.push(mapped)
      itensPorAgendamento.set(item.agendamento_id, lista)
    } else {
      itensSemPassageiro.push(mapped)
    }
  }

  const refsImportados = new Set(
    itensPcRows
      .map((item) => extrairCustoPlanejadoIdDaDescricao(item.descricao))
      .filter((id): id is string => Boolean(id))
  )

  const passageiros: ViagemFinanceiroPcPassageiroItem[] = viagem.passageiros.map((passageiro) => {
    const solicitacao = passageiro.agendamento.solicitacao
    const custosPlanejados: TfdCustoPlanejadoItem[] = solicitacao.custos_planejados.map((custo) => ({
      id: custo.id,
      tipo: custo.tipo,
      descricao: custo.descricao,
      quantidadeDias: custo.quantidade_dias,
      valor: Number(custo.valor),
      createdAt: custo.created_at.toISOString(),
      updatedAt: custo.updated_at.toISOString(),
    }))

    const valorEstimado = roundMoney(
      custosPlanejados.reduce((acc, custo) => acc + custo.valor, 0)
    )

    const reserva = solicitacao.reservas[0] ?? null
    const itensPc = itensPorAgendamento.get(passageiro.agendamento_id) ?? []
    const valorLancadoPc = roundMoney(itensPc.reduce((acc, item) => acc + item.valor, 0))

    const custosPendentesImportacao = custosPlanejados.filter(
      (custo) => !refsImportados.has(custo.id)
    ).length

    return {
      passageiroId: passageiro.id,
      agendamentoId: passageiro.agendamento_id,
      solicitacaoId: solicitacao.id,
      protocoloSolicitacao: solicitacao.protocolo,
      pacienteNome: solicitacao.paciente.nome,
      custosPlanejados,
      valorEstimado,
      reservaAtiva: reserva ? { valor: Number(reserva.valor_estimado) } : null,
      itensPc,
      valorLancadoPc,
      custosPendentesImportacao,
    }
  })

  const estimadoSolicitacoes = roundMoney(
    passageiros.reduce((acc, item) => acc + item.valorEstimado, 0)
  )

  const reservadoSolicitacoes = roundMoney(
    passageiros.reduce((acc, item) => acc + (item.reservaAtiva?.valor ?? 0), 0)
  )

  const lancadoPc = roundMoney(
    itensPcRows.reduce((acc, item) => acc + Number(item.valor), 0)
  )

  const pendenteEstimado = roundMoney(Math.max(0, estimadoSolicitacoes - lancadoPc))

  const adiantamentoSugerido = reservadoSolicitacoes

  return {
    viagemId: viagem.id,
    viagemConcluida: viagem.status === 'CONCLUIDA',
    totais: {
      estimadoSolicitacoes,
      reservadoSolicitacoes,
      lancadoPc,
      pendenteEstimado,
    },
    adiantamentoSugerido,
    passageiros,
    itensPcSemPassageiro: itensSemPassageiro,
  }
}
