import { requireSuperAdmin } from '@saude/core-auth'
import { getPrismaAdmin } from '@saude/core-db'
import type { PrismaClient } from '@saude/core-db'
import { calcSaldoDisponivel } from '@saude/mod-saude-tfd'
import type {
  ExtratoMovimentacaoItem,
  SaldoListItem,
  TfdFonteRecursoValor,
} from '@saude/mod-saude-tfd'
import { z } from 'zod'

export class ExtratoSaldoTenantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExtratoSaldoTenantError'
  }
}

export interface GetExtratoSaldoByTenantResult {
  items: ExtratoMovimentacaoItem[]
  total: number
  saldo: SaldoListItem
}

const extratoByTenantSchema = z.object({
  tenantId: z.string().uuid('ID do município inválido.'),
  saldoId: z.string().uuid('ID do saldo inválido.'),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
})

type SaldoRowSelect = {
  id: string
  descricao: string
  fonte: string
  valor_total: { toString(): string } | number
  competencia_inicio: Date
  competencia_fim: Date
  ativo: boolean
  created_at: Date
}

const saldoSelect = {
  id: true,
  descricao: true,
  fonte: true,
  valor_total: true,
  competencia_inicio: true,
  competencia_fim: true,
  ativo: true,
  created_at: true,
} as const

function decimalToNumber(value: SaldoRowSelect['valor_total']): number {
  return typeof value === 'number' ? value : Number(value)
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function buildSaldoListItems(
  db: PrismaClient,
  tenantId: string,
  rows: SaldoRowSelect[]
): Promise<SaldoListItem[]> {
  if (rows.length === 0) {
    return []
  }

  const saldoIds = rows.map((row) => row.id)

  const [reservasAgg, consumosAgg] = await Promise.all([
    db.tfdReservaSaldo.groupBy({
      by: ['saldo_id'],
      where: {
        tenant_id: tenantId,
        saldo_id: { in: saldoIds },
        status: 'ATIVA',
      },
      _sum: { valor_estimado: true },
    }),
    db.tfdMovimentacaoSaldo.groupBy({
      by: ['saldo_id'],
      where: {
        tenant_id: tenantId,
        saldo_id: { in: saldoIds },
        tipo: 'CONSUMO',
      },
      _sum: { valor: true },
    }),
  ])

  const reservadoPorSaldo = new Map(
    reservasAgg.map((item) => [item.saldo_id, Number(item._sum.valor_estimado ?? 0)])
  )
  const consumidoPorSaldo = new Map(
    consumosAgg.map((item) => [item.saldo_id, Number(item._sum.valor ?? 0)])
  )

  return rows.map((row) => {
    const valorTotal = decimalToNumber(row.valor_total)
    const valorReservado = reservadoPorSaldo.get(row.id) ?? 0
    const valorUtilizado = consumidoPorSaldo.get(row.id) ?? 0
    const derivados = calcSaldoDisponivel({
      valorTotal,
      valorReservado,
      valorConsumido: valorUtilizado,
    })

    return {
      id: row.id,
      descricao: row.descricao,
      fonte: row.fonte as TfdFonteRecursoValor,
      valorTotal,
      valorReservado,
      valorUtilizado,
      valorDisponivel: derivados.valorDisponivel,
      percentualDisponivel: derivados.percentualDisponivel,
      alertaBaixo: derivados.alertaBaixo,
      competenciaInicio: formatDateOnly(row.competencia_inicio),
      competenciaFim: formatDateOnly(row.competencia_fim),
      ativo: row.ativo,
      createdAt: row.created_at.toISOString(),
    }
  })
}

async function getSaldoListItemById(
  db: PrismaClient,
  tenantId: string,
  saldoId: string
): Promise<SaldoListItem | null> {
  const row = await db.tfdSaldo.findFirst({
    where: { id: saldoId, tenant_id: tenantId },
    select: saldoSelect,
  })

  if (!row) {
    return null
  }

  const [item] = await buildSaldoListItems(db, tenantId, [row])
  return item ?? null
}

/** Lista saldos do tenant (ativos e inativos) — visão SUPERADMIN no Painel Dev. */
export async function getSaldosTfdByTenant(tenantId: string): Promise<SaldoListItem[]> {
  await requireSuperAdmin()

  const normalizedTenantId = tenantId.trim()
  if (!z.string().uuid().safeParse(normalizedTenantId).success) {
    return []
  }

  const db = getPrismaAdmin()

  const rows = await db.tfdSaldo.findMany({
    where: { tenant_id: normalizedTenantId },
    select: saldoSelect,
    orderBy: [{ ativo: 'desc' }, { created_at: 'desc' }],
  })

  return buildSaldoListItems(db, normalizedTenantId, rows)
}

/** Extrato paginado de um saldo do tenant — sem filtro de data obrigatório. */
export async function getExtratoSaldoByTenant(
  rawFiltros: unknown
): Promise<GetExtratoSaldoByTenantResult> {
  await requireSuperAdmin()

  const parsed = extratoByTenantSchema.safeParse(rawFiltros)
  if (!parsed.success) {
    throw new ExtratoSaldoTenantError('Filtros de extrato inválidos.')
  }

  const { tenantId, saldoId, page, perPage } = parsed.data
  const db = getPrismaAdmin()

  const saldo = await getSaldoListItemById(db, tenantId, saldoId)
  if (!saldo) {
    throw new ExtratoSaldoTenantError('Saldo não encontrado.')
  }

  const whereMovimentacoes = {
    tenant_id: tenantId,
    saldo_id: saldoId,
  }

  const [movimentacoes, total] = await Promise.all([
    db.tfdMovimentacaoSaldo.findMany({
      where: whereMovimentacoes,
      select: {
        tipo: true,
        valor: true,
        descricao: true,
        created_at: true,
        solicitacao_id: true,
        usuario: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdMovimentacaoSaldo.count({ where: whereMovimentacoes }),
  ])

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

  const items: ExtratoMovimentacaoItem[] = movimentacoes.map((row) => ({
    tipo: row.tipo,
    valor: Number(row.valor),
    descricao: row.descricao,
    protocolo: row.solicitacao_id
      ? (protocoloPorSolicitacao.get(row.solicitacao_id) ?? null)
      : null,
    usuarioNome: row.usuario.name,
    criadoEm: row.created_at.toISOString(),
  }))

  return { items, total, saldo }
}
