import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type {
  TfdComprovanteVistoItem,
  TfdViagemSolicitacaoItem,
} from '../types/tfd.types'

function formatHoraSaida(hora: Date | null): string | null {
  if (!hora) {
    return null
  }

  const horas = hora.getUTCHours().toString().padStart(2, '0')
  const minutos = hora.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
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

export async function getViagensSolicitacaoTfd(
  solicitacaoId: string
): Promise<TfdViagemSolicitacaoItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const solicitacao = await db.tfdSolicitacao.findFirst({
    where: {
      id: solicitacaoId,
      tenant_id: tenantId,
    },
    select: { id: true },
  })

  if (!solicitacao) {
    return []
  }

  const rows = await db.tfdViagem.findMany({
    where: {
      tenant_id: tenantId,
      solicitacao_id: solicitacaoId,
    },
    select: {
      id: true,
      sequencia: true,
      data_viagem: true,
      hora_saida: true,
      status: true,
      lembrete_48h_enviado_at: true,
      lembrete_48h_falhou_at: true,
      motorista: {
        select: {
          user: { select: { name: true } },
        },
      },
      veiculo: {
        select: {
          placa: true,
          modelo: true,
        },
      },
      prestacao_conta: {
        select: {
          id: true,
          status: true,
          prazo_envio_at: true,
          observacoes_gestor: true,
          comprovantes_vistos: true,
        },
      },
      itens_despesa: {
        select: {
          id: true,
          tipo: true,
          valor: true,
          descricao: true,
          comprovante_anexo_id: true,
          responsavel_pagamento: true,
        },
        orderBy: { created_at: 'asc' },
      },
    },
    orderBy: { sequencia: 'asc' },
  })

  return rows.map((row) => ({
    id: row.id,
    sequencia: row.sequencia,
    dataViagem: row.data_viagem.toISOString().slice(0, 10),
    horaSaida: formatHoraSaida(row.hora_saida),
    status: row.status,
    motorista: row.motorista ? { nome: row.motorista.user.name } : null,
    veiculo: row.veiculo
      ? {
          placa: row.veiculo.placa,
          modelo: row.veiculo.modelo,
        }
      : null,
    lembrete48hEnviadoAt: row.lembrete_48h_enviado_at?.toISOString() ?? null,
    lembrete48hFalhouAt: row.lembrete_48h_falhou_at?.toISOString() ?? null,
    prestacao: row.prestacao_conta
      ? {
          id: row.prestacao_conta.id,
          status: row.prestacao_conta.status,
          prazoEnvioAt: row.prestacao_conta.prazo_envio_at.toISOString(),
          observacoesGestor: row.prestacao_conta.observacoes_gestor,
          comprovantesVistos: parseComprovantesVistos(row.prestacao_conta.comprovantes_vistos),
        }
      : null,
    itensDespesa: row.itens_despesa.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      valor: Number(item.valor),
      descricao: item.descricao,
      comprovanteAnexoId: item.comprovante_anexo_id,
      responsavelPagamento: item.responsavel_pagamento,
    })),
  }))
}
