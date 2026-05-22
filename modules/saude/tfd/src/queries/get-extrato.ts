import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { TFD_PERMISSIONS } from '../permissions'
import { filtrosExtratoSchema } from '../validators/financeiro.schema'
import type { ExtratoMovimentacaoItem, SaldoListItem } from '../types/tfd.types'
import { getSaldoListItemById } from './get-saldos'

export class ExtratoSaldoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExtratoSaldoError'
  }
}

export interface GetExtratoSaldoResult {
  items: ExtratoMovimentacaoItem[]
  total: number
  saldo: SaldoListItem
}

function parseFiltroDataInicio(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function parseFiltroDataFim(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`)
}

export async function getExtratoSaldo(
  rawFiltros: unknown
): Promise<GetExtratoSaldoResult> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const parsed = filtrosExtratoSchema.safeParse(rawFiltros)
  if (!parsed.success) {
    throw new ExtratoSaldoError('Filtros de extrato inválidos.')
  }

  const { saldoId, dataInicio, dataFim, page = 1, perPage = 20 } = parsed.data
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const saldo = await getSaldoListItemById(db, tenantId, saldoId)
  if (!saldo) {
    throw new ExtratoSaldoError('Saldo não encontrado.')
  }

  const whereMovimentacoes = {
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
