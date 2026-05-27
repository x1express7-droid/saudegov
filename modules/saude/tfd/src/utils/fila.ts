import type { TfdFilaMovimentacaoTipo } from '@prisma/client'

import type { PrismaTransactionClient } from '@saude/core-documents'

export async function obterProximaPosicaoFila(
  tx: PrismaTransactionClient,
  tenantId: string
): Promise<number> {
  const agg = await tx.tfdSolicitacao.aggregate({
    where: {
      tenant_id: tenantId,
      posicao_fila: { not: null },
    },
    _max: { posicao_fila: true },
  })

  return (agg._max.posicao_fila ?? 0) + 1
}

export async function registrarMovimentacaoFila(
  tx: PrismaTransactionClient,
  params: {
    tenantId: string
    solicitacaoId: string
    usuarioId: string
    tipo: TfdFilaMovimentacaoTipo
    posicaoAnterior: number | null
    posicaoNova: number | null
    justificativa?: string | null
  }
): Promise<void> {
  await tx.tfdFilaMovimentacao.create({
    data: {
      tenant_id: params.tenantId,
      solicitacao_id: params.solicitacaoId,
      usuario_id: params.usuarioId,
      tipo_movimentacao: params.tipo,
      posicao_anterior: params.posicaoAnterior,
      posicao_nova: params.posicaoNova,
      justificativa: params.justificativa?.trim() || null,
    },
  })
}

export async function registrarEntradaFila(
  tx: PrismaTransactionClient,
  params: {
    tenantId: string
    solicitacaoId: string
    usuarioId: string
    justificativa?: string
  }
): Promise<number> {
  const posicaoNova = await obterProximaPosicaoFila(tx, params.tenantId)

  await tx.tfdSolicitacao.update({
    where: { id: params.solicitacaoId },
    data: { posicao_fila: posicaoNova },
  })

  await registrarMovimentacaoFila(tx, {
    tenantId: params.tenantId,
    solicitacaoId: params.solicitacaoId,
    usuarioId: params.usuarioId,
    tipo: 'ENTRADA',
    posicaoAnterior: null,
    posicaoNova,
    justificativa:
      params.justificativa ??
      'Entrada na fila de regulação ao registrar a solicitação TFD.',
  })

  return posicaoNova
}

export async function registrarSaidaFila(
  tx: PrismaTransactionClient,
  params: {
    tenantId: string
    solicitacaoId: string
    usuarioId: string
    justificativa: string
  }
): Promise<void> {
  const solicitacao = await tx.tfdSolicitacao.findFirst({
    where: {
      id: params.solicitacaoId,
      tenant_id: params.tenantId,
    },
    select: { posicao_fila: true },
  })

  const posicaoAnterior = solicitacao?.posicao_fila ?? null
  if (posicaoAnterior === null) {
    return
  }

  await tx.tfdSolicitacao.update({
    where: { id: params.solicitacaoId },
    data: { posicao_fila: null },
  })

  await registrarMovimentacaoFila(tx, {
    tenantId: params.tenantId,
    solicitacaoId: params.solicitacaoId,
    usuarioId: params.usuarioId,
    tipo: 'SAIDA',
    posicaoAnterior,
    posicaoNova: null,
    justificativa: params.justificativa,
  })
}
