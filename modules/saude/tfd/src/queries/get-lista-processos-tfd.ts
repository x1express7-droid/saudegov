import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { ProcessoStatus, TfdStatusSolicitacao, TfdUrgencia } from '@prisma/client'

import type { ProcessoTfdListItem } from '../types/tfd.types'
import { PROCESSO_STATUS_ABERTOS } from './get-processo-aberto-paciente-tfd'

export type { ProcessoTfdListItem } from '../types/tfd.types'

const MODULO_TFD = 'saude.tfd'
const MAX_PER_PAGE = 100
const DEFAULT_PER_PAGE = 20

const SOLICITACAO_TERMINAIS: TfdStatusSolicitacao[] = ['CONCLUIDO', 'NEGADO', 'CANCELADO']

const URGENCIA_RANK: Record<TfdUrgencia, number> = {
  MUITO_URGENTE: 4,
  GRAVE: 3,
  INTERMEDIARIA: 2,
  BAIXA: 1,
  NAO_AGUDA: 0,
}

export interface GetListaProcessosFiltros {
  statusProcesso?: ProcessoStatus
  urgencia?: TfdUrgencia
  pacienteNome?: string
  protocolo?: string
  dataInicio?: string
  dataFim?: string
  /** Quando true (padrão sem filtro de status), retorna apenas processos em aberto/andamento. */
  somenteAtivos?: boolean
  page?: number
  perPage?: number
}

type SolicitacaoResumoRow = {
  urgencia: TfdUrgencia
  status: TfdStatusSolicitacao
  updated_at: Date
}

function isSolicitacaoAtiva(status: TfdStatusSolicitacao): boolean {
  return !SOLICITACAO_TERMINAIS.includes(status)
}

function calcularUrgenciaMaisCritica(
  solicitacoes: SolicitacaoResumoRow[]
): TfdUrgencia | null {
  const ativas = solicitacoes.filter((row) => isSolicitacaoAtiva(row.status))
  if (ativas.length === 0) {
    return null
  }

  return ativas.reduce<TfdUrgencia>((maior, atual) => {
    return URGENCIA_RANK[atual.urgencia] > URGENCIA_RANK[maior] ? atual.urgencia : maior
  }, ativas[0]!.urgencia)
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function calcularValorTotalEstimado(
  solicitacoes: Array<{ custos_planejados: Array<{ valor: unknown }> }>
): number {
  const total = solicitacoes.reduce((accSolicitacao, solicitacao) => {
    const subtotal = solicitacao.custos_planejados.reduce(
      (accCusto, custo) => accCusto + Number(custo.valor),
      0
    )
    return accSolicitacao + subtotal
  }, 0)

  return roundMoney(total)
}

function calcularStatusSolicitacaoMaisRecente(
  solicitacoes: SolicitacaoResumoRow[]
): string | null {
  if (solicitacoes.length === 0) {
    return null
  }

  const maisRecente = solicitacoes.reduce((acc, atual) =>
    atual.updated_at > acc.updated_at ? atual : acc
  )

  return maisRecente.status
}

export async function getListaProcessosTfd(
  filtros: GetListaProcessosFiltros = {}
): Promise<{ items: ProcessoTfdListItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId
  if (!tenantId) {
    throw new Error('Tenant não identificado para listagem de processos TFD.')
  }

  if (session.user.role === 'SERVIDOR' && !session.user.setorId) {
    return { items: [], total: 0 }
  }

  const page = Math.max(1, filtros.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filtros.perPage ?? DEFAULT_PER_PAGE))

  const db = await getPrismaForTenant(tenantId)

  const pacienteNome = filtros.pacienteNome?.trim()
  const protocolo = filtros.protocolo?.trim()

  const createdAtFilter =
    filtros.dataInicio || filtros.dataFim
      ? {
          ...(filtros.dataInicio ? { gte: new Date(`${filtros.dataInicio}T00:00:00.000Z`) } : {}),
          ...(filtros.dataFim ? { lte: new Date(`${filtros.dataFim}T23:59:59.999Z`) } : {}),
        }
      : undefined

  const whereClause = {
    tenant_id: tenantId,
    modulo: MODULO_TFD,
    ...(session.user.role === 'SERVIDOR' ? { setor_id: session.user.setorId! } : {}),
    ...(filtros.statusProcesso
      ? { status: filtros.statusProcesso }
      : filtros.somenteAtivos !== false
        ? { status: { in: PROCESSO_STATUS_ABERTOS } }
        : {}),
    ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
    ...(pacienteNome
      ? {
          paciente: {
            nome: {
              contains: pacienteNome,
              mode: 'insensitive' as const,
            },
          },
        }
      : {}),
    ...(protocolo
      ? {
          protocolo: {
            contains: protocolo,
            mode: 'insensitive' as const,
          },
        }
      : {}),
    ...(filtros.urgencia
      ? {
          tfd_solicitacoes: {
            some: {
              urgencia: filtros.urgencia,
            },
          },
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    db.processo.findMany({
      where: whereClause,
      select: {
        id: true,
        protocolo: true,
        status: true,
        updated_at: true,
        created_at: true,
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            telefone_celular: true,
            telefone: true,
            telefone_alternativo: true,
          },
        },
        tfd_solicitacoes: {
          select: {
            id: true,
            protocolo: true,
            urgencia: true,
            status: true,
            updated_at: true,
            custos_planejados: {
              select: { valor: true },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { updated_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.processo.count({ where: whereClause }),
  ])

  const items: ProcessoTfdListItem[] = rows.map((row) => ({
    processoId: row.id,
    protocolo: row.protocolo,
    statusProcesso: row.status,
    paciente: row.paciente
      ? {
          id: row.paciente.id,
          nome: row.paciente.nome,
          cpf: row.paciente.cpf,
          telefone:
            row.paciente.telefone_celular ??
            row.paciente.telefone ??
            row.paciente.telefone_alternativo ??
            null,
        }
      : null,
    solicitacoes: row.tfd_solicitacoes.map((solicitacao) => ({
      id: solicitacao.id,
      protocolo: solicitacao.protocolo,
    })),
    urgenciaMaisCritica: calcularUrgenciaMaisCritica(row.tfd_solicitacoes),
    statusSolicitacaoMaisRecente: calcularStatusSolicitacaoMaisRecente(row.tfd_solicitacoes),
    valorTotalEstimado: calcularValorTotalEstimado(row.tfd_solicitacoes),
    ultimaMovimentacaoEm: row.updated_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  }))

  return { items, total }
}
