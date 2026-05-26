import type { TfdMovimentacaoTipo } from '@prisma/client'
import type { getPrismaForTenant } from '@saude/core-db'
import type { ExtratoMovimentacaoItem } from '../types/tfd.types'
import { isTipoMovimentacaoEstornavel } from '../utils/saldo-movimentacao'

type TenantDb = Awaited<ReturnType<typeof getPrismaForTenant>>

const DESCRICAO_RESUMO_MAX = 80

export function parseFiltroDataInicio(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export function parseFiltroDataFim(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`)
}

export function buildWhereMovimentacoesExtrato(params: {
  tenantId: string
  saldoId: string
  dataInicio?: string
  dataFim?: string
}) {
  const { tenantId, saldoId, dataInicio, dataFim } = params

  return {
    tenant_id: tenantId,
    saldo_id: saldoId,
    ...(dataInicio || dataFim
      ? {
          created_at: {
            ...(dataInicio ? { gte: parseFiltroDataInicio(dataInicio) } : {}),
            ...(dataFim ? { lte: parseFiltroDataFim(dataFim) } : {}),
          },
        }
      : {}),
  }
}

const movimentacaoSelect = {
  id: true,
  tipo: true,
  valor: true,
  descricao: true,
  created_at: true,
  solicitacao_id: true,
  movimentacao_origem_id: true,
  movimentacao_origem: {
    select: {
      tipo: true,
      descricao: true,
    },
  },
  usuario: { select: { name: true } },
} as const

export type MovimentacaoExtratoRow = {
  id: string
  tipo: string
  valor: { toString(): string } | number
  descricao: string
  created_at: Date
  solicitacao_id: string | null
  movimentacao_origem_id: string | null
  movimentacao_origem: {
    tipo: string
    descricao: string
  } | null
  usuario: { name: string }
}

function resumirDescricao(texto: string): string {
  const trimmed = texto.trim()
  if (trimmed.length <= DESCRICAO_RESUMO_MAX) {
    return trimmed
  }
  return `${trimmed.slice(0, DESCRICAO_RESUMO_MAX - 1)}…`
}

export async function mapMovimentacoesToExtratoItems(
  db: TenantDb,
  tenantId: string,
  movimentacoes: MovimentacaoExtratoRow[]
): Promise<ExtratoMovimentacaoItem[]> {
  const movimentacaoIds = movimentacoes.map((row) => row.id)

  const estornadasIds = new Set<string>()

  if (movimentacaoIds.length > 0) {
    const estornos = await db.tfdMovimentacaoSaldo.findMany({
      where: {
        tenant_id: tenantId,
        tipo: 'ESTORNO',
        movimentacao_origem_id: { in: movimentacaoIds },
      },
      select: { movimentacao_origem_id: true },
    })

    for (const estorno of estornos) {
      if (estorno.movimentacao_origem_id) {
        estornadasIds.add(estorno.movimentacao_origem_id)
      }
    }
  }

  const solicitacaoIds = [
    ...new Set(
      movimentacoes
        .map((row) => row.solicitacao_id)
        .filter((id): id is string => id !== null)
    ),
  ]

  const protocoloPorSolicitacao = new Map<string, string>()

  if (solicitacaoIds.length > 0) {
    const solicitacoes = await db.tfdSolicitacao.findMany({
      where: {
        tenant_id: tenantId,
        id: { in: solicitacaoIds },
      },
      select: {
        id: true,
        processo: { select: { protocolo: true } },
      },
    })

    for (const solicitacao of solicitacoes) {
      protocoloPorSolicitacao.set(solicitacao.id, solicitacao.processo.protocolo)
    }
  }

  return movimentacoes.map((row) => {
    const jaEstornada = estornadasIds.has(row.id)
    const podeEstornar =
      isTipoMovimentacaoEstornavel(row.tipo as TfdMovimentacaoTipo) && !jaEstornada

    const movimentacaoOrigem = row.movimentacao_origem
      ? {
          tipo: row.movimentacao_origem.tipo,
          descricaoResumo: resumirDescricao(row.movimentacao_origem.descricao),
        }
      : null

    return {
      id: row.id,
      tipo: row.tipo,
      valor: Number(row.valor),
      descricao: row.descricao,
      protocolo: row.solicitacao_id
        ? (protocoloPorSolicitacao.get(row.solicitacao_id) ?? null)
        : null,
      usuarioNome: row.usuario.name,
      criadoEm: row.created_at.toISOString(),
      movimentacaoOrigem,
      podeEstornar,
      jaEstornada,
    }
  })
}

export { movimentacaoSelect }
