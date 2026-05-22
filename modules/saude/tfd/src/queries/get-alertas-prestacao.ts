import { addHours } from 'date-fns'
import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { AlertaPrestacaoMotivo, AlertaPrestacaoPrazo } from '../types/tfd.types'

function mapRowToAlerta(
  row: {
    id: string
    prazo_envio_at: Date
    lembrete_48h_falhou_at: Date | null
    viagem: {
      sequencia: number
      solicitacao: {
        id: string
        processo: { protocolo: string }
      }
    }
  },
  motivo: AlertaPrestacaoMotivo
): AlertaPrestacaoPrazo {
  return {
    id: row.id,
    motivo,
    prazoEnvioAt: row.prazo_envio_at.toISOString().slice(0, 10),
    lembrete48hFalhouAt: row.lembrete_48h_falhou_at?.toISOString() ?? null,
    sequenciaViagem: row.viagem.sequencia,
    solicitacao: {
      id: row.viagem.solicitacao.id,
      protocolo: row.viagem.solicitacao.processo.protocolo,
    },
  }
}

const prestacaoSelect = {
  id: true,
  prazo_envio_at: true,
  lembrete_48h_falhou_at: true,
  viagem: {
    select: {
      sequencia: true,
      solicitacao: {
        select: {
          id: true,
          processo: { select: { protocolo: true } },
        },
      },
    },
  },
} as const

const solicitacaoAguardandoPc = {
  status: 'AGUARDANDO_PC' as const,
}

/**
 * Alertas de prestação de contas para gestores na fila TFD:
 * lembrete 48h falhou, prazo vencido ou vencendo em até 48h.
 */
export async function getAlertasPrestacaoTfd(): Promise<AlertaPrestacaoPrazo[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)
  const agora = new Date()
  const prazoLimiteSuperior = addHours(agora, 48)

  const baseWhere = {
    tenant_id: tenantId,
    status: 'PENDENTE' as const,
    viagem: {
      solicitacao: solicitacaoAguardandoPc,
    },
  }

  const [falhas, vencidas, vencendo] = await Promise.all([
    db.tfdPrestacaoConta.findMany({
      where: {
        ...baseWhere,
        lembrete_48h_falhou_at: { not: null },
        lembrete_48h_enviado_at: null,
      },
      select: prestacaoSelect,
      orderBy: [{ lembrete_48h_falhou_at: 'asc' }, { prazo_envio_at: 'asc' }],
    }),
    db.tfdPrestacaoConta.findMany({
      where: {
        ...baseWhere,
        prazo_envio_at: { lt: agora },
      },
      select: prestacaoSelect,
      orderBy: { prazo_envio_at: 'asc' },
    }),
    db.tfdPrestacaoConta.findMany({
      where: {
        ...baseWhere,
        prazo_envio_at: {
          gte: agora,
          lte: prazoLimiteSuperior,
        },
      },
      select: prestacaoSelect,
      orderBy: { prazo_envio_at: 'asc' },
    }),
  ])

  const vistos = new Set<string>()
  const alertas: AlertaPrestacaoPrazo[] = []

  const append = (rows: typeof falhas, motivo: AlertaPrestacaoMotivo) => {
    for (const row of rows) {
      if (vistos.has(row.id)) {
        continue
      }
      vistos.add(row.id)
      alertas.push(mapRowToAlerta(row, motivo))
    }
  }

  append(falhas, 'LEMBRETE_FALHOU')
  append(vencidas, 'PRAZO_VENCIDO')
  append(vencendo, 'PRAZO_VENCENDO')

  return alertas
}
