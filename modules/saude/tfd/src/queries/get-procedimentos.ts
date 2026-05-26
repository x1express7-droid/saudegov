import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdListagemFiltros, TfdPaginatedResult, TfdProcedimentoListItem } from '../types/tfd.types'

export interface GetProcedimentosFiltros extends TfdListagemFiltros {
  especialidadeId?: string
}

export async function getProcedimentosTfd(
  filtros: GetProcedimentosFiltros = {}
): Promise<TfdPaginatedResult<TfdProcedimentoListItem>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const page = filtros.page ?? 1
  const perPage = filtros.perPage ?? 20
  const db = await getPrismaForTenant(tenantId)

  const where = {
    tenant_id: tenantId,
    ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
    ...(filtros.especialidadeId ? { especialidade_id: filtros.especialidadeId } : {}),
  }

  const [rows, total] = await Promise.all([
    db.tfdProcedimento.findMany({
      where,
      select: {
        id: true,
        especialidade_id: true,
        nome: true,
        codigo_sigtap: true,
        eh_pab: true,
        ativo: true,
        created_at: true,
        especialidade: { select: { nome: true } },
      },
      orderBy: [{ especialidade: { nome: 'asc' } }, { nome: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdProcedimento.count({ where }),
  ])

  return {
    items: rows.map((row) => ({
      id: row.id,
      especialidadeId: row.especialidade_id,
      especialidadeNome: row.especialidade.nome,
      nome: row.nome,
      codigoSigtap: row.codigo_sigtap,
      ehPab: row.eh_pab,
      ativo: row.ativo,
      createdAt: row.created_at.toISOString(),
    })),
    total,
    page,
    perPage,
  }
}
