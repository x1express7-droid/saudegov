import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdStatusSolicitacao, TfdUrgencia } from '@prisma/client'

import type { TfdSolicitacaoListItem } from '../types/tfd.types'

const MAX_PER_PAGE = 100
const DEFAULT_PER_PAGE = 20

export interface GetSolicitacoesFiltros {
  status?: TfdStatusSolicitacao
  urgencia?: TfdUrgencia
  /** Busca parcial em `solicitacao.protocolo` (case-insensitive). */
  protocolo?: string
  page?: number
  perPage?: number
}

type SolicitacaoListRow = {
  id: string
  processo_id: string
  protocolo: string
  status: TfdStatusSolicitacao
  urgencia: TfdUrgencia
  tipo_atendimento: string
  posicao_fila: number | null
  created_at: Date
  paciente: { nome: string }
  especialidade: { nome: string } | null
  prestador: { nome: string; cidade: string; estado: string } | null
}

function mapToListItem(row: SolicitacaoListRow): TfdSolicitacaoListItem {
  return {
    id: row.id,
    processoId: row.processo_id,
    protocolo: row.protocolo,
    status: row.status,
    urgencia: row.urgencia,
    especialidade: row.especialidade?.nome ?? '—',
    prestador: {
      nome: row.prestador?.nome ?? '—',
      cidade: row.prestador?.cidade ?? '—',
      estado: row.prestador?.estado ?? '—',
    },
    paciente: {
      nome: row.paciente.nome,
    },
    tipoAtendimento: row.tipo_atendimento,
    criadoEm: row.created_at.toISOString(),
    posicaoFila: row.posicao_fila,
  }
}

const solicitacaoListSelect = {
  id: true,
  processo_id: true,
  protocolo: true,
  status: true,
  urgencia: true,
  tipo_atendimento: true,
  posicao_fila: true,
  created_at: true,
  paciente: { select: { nome: true } },
  especialidade: { select: { nome: true } },
  prestador: { select: { nome: true, cidade: true, estado: true } },
} as const

export async function getSolicitacoesTfd(
  filtros: GetSolicitacoesFiltros = {}
): Promise<{ items: TfdSolicitacaoListItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId
  if (!tenantId) {
    throw new Error('Tenant não identificado para listagem TFD.')
  }
  const page = Math.max(1, filtros.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filtros.perPage ?? DEFAULT_PER_PAGE))

  if (session.user.role === 'SERVIDOR' && !session.user.setorId) {
    return { items: [], total: 0 }
  }

  const db = await getPrismaForTenant(tenantId)

  const protocoloBusca = filtros.protocolo?.trim()

  const processoSetorWhere =
    session.user.role === 'SERVIDOR' ? { setor_id: session.user.setorId! } : undefined

  const whereClause = {
    tenant_id: tenantId,
    ...(processoSetorWhere ? { processo: processoSetorWhere } : {}),
    ...(protocoloBusca
      ? {
          protocolo: {
            contains: protocoloBusca,
            mode: 'insensitive' as const,
          },
        }
      : {}),
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(filtros.urgencia ? { urgencia: filtros.urgencia } : {}),
  }

  const [rows, total] = await Promise.all([
    db.tfdSolicitacao.findMany({
      where: whereClause,
      select: solicitacaoListSelect,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdSolicitacao.count({ where: whereClause }),
  ])

  return {
    items: rows.map(mapToListItem),
    total,
  }
}
