import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdPrestacaoStatus } from '@prisma/client'

import type { TfdPrestacaoListItem } from '../types/tfd.types'

const MAX_PER_PAGE = 100
const DEFAULT_PER_PAGE = 20

export interface GetPrestacoesFiltros {
  status?: TfdPrestacaoStatus
  page?: number
  perPage?: number
}

type PrestacaoListRow = {
  id: string
  status: TfdPrestacaoStatus
  prazo_envio_at: Date
  viagem: {
    sequencia: number
    protocolo: string
    itens_despesa: { valor: { toString(): string } | number }[]
    solicitacao: {
      id: string
      protocolo: string
      paciente: { nome: string }
      especialidade: { nome: string } | null
    }
  }
}

function mapToListItem(row: PrestacaoListRow): TfdPrestacaoListItem {
  const valorTotal = row.viagem.itens_despesa.reduce((acc, item) => acc + Number(item.valor), 0)

  return {
    id: row.id,
    status: row.status,
    prazoEnvioAt: row.prazo_envio_at.toISOString().slice(0, 10),
    valorTotal,
    quantidadeItens: row.viagem.itens_despesa.length,
    sequenciaViagem: row.viagem.sequencia,
    protocolo: row.viagem.protocolo,
    solicitacaoId: row.viagem.solicitacao.id,
    paciente: { nome: row.viagem.solicitacao.paciente.nome },
    especialidade: row.viagem.solicitacao.especialidade?.nome ?? '—',
  }
}

const prestacaoListSelect = {
  id: true,
  status: true,
  prazo_envio_at: true,
  viagem: {
    select: {
      sequencia: true,
      protocolo: true,
      itens_despesa: {
        select: { valor: true },
      },
      solicitacao: {
        select: {
          id: true,
          protocolo: true,
          paciente: { select: { nome: true } },
          especialidade: { select: { nome: true } },
        },
      },
    },
  },
} as const

export async function getPrestacoesTfd(
  filtros: GetPrestacoesFiltros = {}
): Promise<{ items: TfdPrestacaoListItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const page = Math.max(1, filtros.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filtros.perPage ?? DEFAULT_PER_PAGE))

  if (session.user.role === 'SERVIDOR' && !session.user.setorId) {
    return { items: [], total: 0 }
  }

  const db = await getPrismaForTenant(tenantId)

  const processoWhere = {
    ...(session.user.role === 'SERVIDOR' ? { setor_id: session.user.setorId! } : {}),
  }

  const whereClause = {
    tenant_id: tenantId,
    viagem_id: { not: null },
    ...(filtros.status ? { status: filtros.status } : {}),
    viagem: {
      solicitacao: {
        ...(Object.keys(processoWhere).length > 0
          ? { processo: processoWhere }
          : {}),
      },
    },
  }

  const [rows, total] = await Promise.all([
    db.tfdPrestacaoConta.findMany({
      where: whereClause,
      select: prestacaoListSelect,
      orderBy: { prazo_envio_at: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdPrestacaoConta.count({ where: whereClause }),
  ])

  const items: TfdPrestacaoListItem[] = []
  for (const row of rows) {
    if (!row.viagem) {
      continue
    }
    items.push(mapToListItem({ ...row, viagem: row.viagem }))
  }

  return { items, total }
}
