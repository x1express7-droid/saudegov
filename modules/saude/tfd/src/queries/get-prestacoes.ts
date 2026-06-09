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

type PrestacaoLegadoRow = {
  id: string
  status: TfdPrestacaoStatus
  prazo_envio_at: Date
  viagem: {
    id: string
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

type PrestacaoViagemNovaRow = {
  id: string
  status: TfdPrestacaoStatus
  prazo_envio_at: Date
  viagem_nova: {
    id: string
    protocolo: string
    itens_despesa: { valor: { toString(): string } | number }[]
    processo: {
      protocolo: string
      tfd_solicitacoes: Array<{
        id: string
        protocolo: string
        paciente: { nome: string }
        especialidade: { nome: string } | null
      }>
    } | null // REMOVE-PROCESSO-PARTE-2
  }
}

function mapLegadoToListItem(row: PrestacaoLegadoRow): TfdPrestacaoListItem {
  const valorTotal = row.viagem.itens_despesa.reduce((acc, item) => acc + Number(item.valor), 0)

  return {
    id: row.id,
    status: row.status,
    prazoEnvioAt: row.prazo_envio_at.toISOString().slice(0, 10),
    valorTotal,
    quantidadeItens: row.viagem.itens_despesa.length,
    sequenciaViagem: row.viagem.sequencia,
    protocolo: row.viagem.solicitacao.protocolo,
    viagemProtocolo: row.viagem.protocolo,
    viagemId: row.viagem.id,
    solicitacaoId: row.viagem.solicitacao.id,
    paciente: { nome: row.viagem.solicitacao.paciente.nome },
    especialidade: row.viagem.solicitacao.especialidade?.nome ?? '—',
  }
}

function mapViagemNovaToListItem(row: PrestacaoViagemNovaRow): TfdPrestacaoListItem {
  // REMOVE-PROCESSO-PARTE-2: processo da viagem nova é opcional
  const processo = row.viagem_nova.processo ?? null
  const solicitacao = processo?.tfd_solicitacoes[0]
  const valorTotal = row.viagem_nova.itens_despesa.reduce(
    (acc, item) => acc + Number(item.valor),
    0
  )

  return {
    id: row.id,
    status: row.status,
    prazoEnvioAt: row.prazo_envio_at.toISOString().slice(0, 10),
    valorTotal,
    quantidadeItens: row.viagem_nova.itens_despesa.length,
    sequenciaViagem: 1,
    protocolo: solicitacao?.protocolo ?? processo?.protocolo ?? row.viagem_nova.protocolo,
    viagemProtocolo: row.viagem_nova.protocolo,
    viagemId: row.viagem_nova.id,
    solicitacaoId: solicitacao?.id ?? '',
    paciente: { nome: solicitacao?.paciente.nome ?? '—' },
    especialidade: solicitacao?.especialidade?.nome ?? '—',
  }
}

const prestacaoLegadoSelect = {
  id: true,
  status: true,
  prazo_envio_at: true,
  viagem: {
    select: {
      id: true,
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

const prestacaoViagemNovaSelect = {
  id: true,
  status: true,
  prazo_envio_at: true,
  viagem_nova: {
    select: {
      id: true,
      protocolo: true,
      itens_despesa: {
        select: { valor: true },
      },
      processo: {
        select: {
          protocolo: true,
          tfd_solicitacoes: {
            orderBy: { created_at: 'desc' as const },
            take: 1,
            select: {
              id: true,
              protocolo: true,
              paciente: { select: { nome: true } },
              especialidade: { select: { nome: true } },
            },
          },
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

  const statusFilter = filtros.status ? { status: filtros.status } : {}

  const whereLegado = {
    tenant_id: tenantId,
    viagem_id: { not: null },
    ...statusFilter,
    viagem: {
      solicitacao: {
        ...(Object.keys(processoWhere).length > 0
          ? { processo: processoWhere }
          : {}),
      },
    },
  }

  const whereViagemNova = {
    tenant_id: tenantId,
    viagem_nova_id: { not: null },
    ...statusFilter,
    viagem_nova: {
      ...(Object.keys(processoWhere).length > 0 ? { processo: processoWhere } : {}),
    },
  }

  const [legadoRows, viagemNovaRows, totalLegado, totalViagemNova] = await Promise.all([
    db.tfdPrestacaoConta.findMany({
      where: whereLegado,
      select: prestacaoLegadoSelect,
      orderBy: { prazo_envio_at: 'asc' },
    }),
    db.tfdPrestacaoConta.findMany({
      where: whereViagemNova,
      select: prestacaoViagemNovaSelect,
      orderBy: { prazo_envio_at: 'asc' },
    }),
    db.tfdPrestacaoConta.count({ where: whereLegado }),
    db.tfdPrestacaoConta.count({ where: whereViagemNova }),
  ])

  const merged: TfdPrestacaoListItem[] = []

  for (const row of legadoRows) {
    if (row.viagem) {
      merged.push(mapLegadoToListItem({ ...row, viagem: row.viagem }))
    }
  }

  for (const row of viagemNovaRows) {
    if (row.viagem_nova) {
      merged.push(mapViagemNovaToListItem({ ...row, viagem_nova: row.viagem_nova }))
    }
  }

  merged.sort((a, b) => a.prazoEnvioAt.localeCompare(b.prazoEnvioAt))

  const total = totalLegado + totalViagemNova
  const start = (page - 1) * perPage
  const items = merged.slice(start, start + perPage)

  return { items, total }
}
