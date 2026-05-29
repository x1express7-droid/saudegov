import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { TfdComprovanteVistoItem } from '../types/tfd.types'
import { buscarItensDespesaDaViagemNova } from '../utils/itens-despesa-viagem-nova'

export interface PrestacaoDetalheViagemNovaOutput {
  id: string
  viagemNovaId: string
  status: string
  prazoEnvioAt: string
  observacoesGestor: string | null
  comprovantesVistos: TfdComprovanteVistoItem[]
  aprovadoAt: string | null
  aprovadoPor: {
    id: string
    nome: string
  } | null
  itensDespesa: Array<{
    id: string
    tipo: string
    valor: number
    descricao: string | null
    comprovanteAnexoId: string | null
    responsavelPagamento: string
  }>
  valorTotal: number
}

function parseComprovantesVistos(raw: unknown): TfdComprovanteVistoItem[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const items: TfdComprovanteVistoItem[] = []

  for (const value of raw) {
    if (typeof value !== 'object' || value === null) {
      continue
    }

    const registro = value as Record<string, unknown>
    if (
      typeof registro.comprovanteAnexoId === 'string' &&
      typeof registro.userId === 'string' &&
      typeof registro.visualizadoAt === 'string'
    ) {
      items.push({
        comprovanteAnexoId: registro.comprovanteAnexoId,
        userId: registro.userId,
        visualizadoAt: registro.visualizadoAt,
      })
    }
  }

  return items
}

export async function getPrestacaoDetalheViagemNova(
  viagemNovaId: string
): Promise<PrestacaoDetalheViagemNovaOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const prestacao = await db.tfdPrestacaoConta.findFirst({
    where: {
      tenant_id: tenantId,
      viagem_nova_id: viagemNovaId,
    },
    select: {
      id: true,
      viagem_nova_id: true,
      status: true,
      prazo_envio_at: true,
      observacoes_gestor: true,
      comprovantes_vistos: true,
      aprovado_at: true,
      aprovado_por: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!prestacao || !prestacao.viagem_nova_id) {
    return null
  }

  const itensRows = await buscarItensDespesaDaViagemNova(db, tenantId, viagemNovaId)

  const itensDespesa = itensRows.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    valor: Number(item.valor),
    descricao: item.descricao,
    comprovanteAnexoId: item.comprovante_anexo_id,
    responsavelPagamento: item.responsavel_pagamento,
  }))

  const valorTotal = itensDespesa.reduce((acc, item) => acc + item.valor, 0)

  return {
    id: prestacao.id,
    viagemNovaId: prestacao.viagem_nova_id,
    status: prestacao.status,
    prazoEnvioAt: prestacao.prazo_envio_at.toISOString(),
    observacoesGestor: prestacao.observacoes_gestor,
    comprovantesVistos: parseComprovantesVistos(prestacao.comprovantes_vistos),
    aprovadoAt: prestacao.aprovado_at?.toISOString() ?? null,
    aprovadoPor: prestacao.aprovado_por
      ? {
          id: prestacao.aprovado_por.id,
          nome: prestacao.aprovado_por.name,
        }
      : null,
    itensDespesa,
    valorTotal,
  }
}
