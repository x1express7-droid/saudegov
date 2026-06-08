import {
  assertModuleActive,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdStatusSolicitacao } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import type { TfdProjecaoFinanceiraOutput } from '../types/tfd.types'
import { buildSaldoListItems } from './get-saldos'

const STATUS_PERMITE_PLANEJAMENTO: TfdStatusSolicitacao[] = [
  'ENVIADO',
  'EM_ANALISE',
  'APROVADO',
]

const STATUS_PERMITE_CONFIRMACAO: TfdStatusSolicitacao[] = ['APROVADO']

export async function getProjecaoFinanceiraSolicitacao(
  solicitacaoId: string
): Promise<TfdProjecaoFinanceiraOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const processoWhere =
    session.user.role === 'SERVIDOR' && session.user.setorId
      ? { setor_id: session.user.setorId }
      : {}

  const solicitacao = await db.tfdSolicitacao.findFirst({
    where: {
      id: solicitacaoId,
      tenant_id: tenantId,
      ...(Object.keys(processoWhere).length > 0 ? { processo: processoWhere } : {}),
    },
    select: {
      id: true,
      status: true,
      saldo_id: true,
      saldo: {
        select: { id: true, descricao: true },
      },
      reservas: {
        where: { status: 'ATIVA' },
        orderBy: { created_at: 'desc' },
        take: 1,
        select: {
          id: true,
          valor_estimado: true,
          status: true,
          saldo_id: true,
          created_at: true,
        },
      },
      custos_planejados: {
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          descricao: true,
          valor: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  })

  if (!solicitacao) {
    return null
  }

  const podeGerenciar = hasPermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)
  const reservaAtiva = solicitacao.reservas[0] ?? null
  const projecaoConfirmada = reservaAtiva !== null

  const statusAtual = solicitacao.status as TfdStatusSolicitacao
  const statusPermitePlanejamento = STATUS_PERMITE_PLANEJAMENTO.includes(statusAtual)
  const statusPermiteConfirmacao = STATUS_PERMITE_CONFIRMACAO.includes(statusAtual)

  const podeEditar = podeGerenciar && statusPermitePlanejamento && !projecaoConfirmada
  const custos = solicitacao.custos_planejados.map((item) => ({
    id: item.id,
    descricao: item.descricao,
    valor: Number(item.valor),
    createdAt: item.created_at.toISOString(),
    updatedAt: item.updated_at.toISOString(),
  }))

  const valorTotal = roundMoney(custos.reduce((acc, item) => acc + item.valor, 0))

  let saldosDisponiveis: TfdProjecaoFinanceiraOutput['saldosDisponiveis'] = []

  const podeConfirmar =
    podeGerenciar && statusPermiteConfirmacao && !projecaoConfirmada && custos.length > 0

  const aguardandoAprovacaoParaConfirmar =
    podeGerenciar &&
    !projecaoConfirmada &&
    custos.length > 0 &&
    !statusPermiteConfirmacao

  if (podeEditar || podeConfirmar) {
    const saldoRows = await db.tfdSaldo.findMany({
      where: { tenant_id: tenantId, ativo: true },
      select: {
        id: true,
        descricao: true,
        fonte: true,
        valor_total: true,
        competencia_inicio: true,
        competencia_fim: true,
        ativo: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    saldosDisponiveis = await buildSaldoListItems(db, tenantId, saldoRows)
  }

  return {
    solicitacaoId: solicitacao.id,
    status: solicitacao.status,
    custos,
    valorTotal,
    reservaAtiva: reservaAtiva
      ? {
          id: reservaAtiva.id,
          valor: Number(reservaAtiva.valor_estimado),
          status: reservaAtiva.status,
          saldoId: reservaAtiva.saldo_id,
          confirmadaEm: reservaAtiva.created_at.toISOString(),
        }
      : null,
    saldoVinculado: solicitacao.saldo
      ? { id: solicitacao.saldo.id, descricao: solicitacao.saldo.descricao }
      : null,
    podeEditar,
    podeConfirmar,
    aguardandoAprovacaoParaConfirmar,
    projecaoConfirmada,
    saldosDisponiveis,
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
