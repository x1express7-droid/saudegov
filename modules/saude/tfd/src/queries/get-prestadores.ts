import { assertModuleActive, requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdListagemFiltros, TfdPaginatedResult, TfdPrestadorListItem } from '../types/tfd.types'

function parseEspecialidadesJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

export async function getPrestadoresTfd(
  filtros: TfdListagemFiltros = {}
): Promise<TfdPaginatedResult<TfdPrestadorListItem>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('ADMIN')

  const tenantId = session.user.tenantId!
  const page = filtros.page ?? 1
  const perPage = filtros.perPage ?? 20
  const db = await getPrismaForTenant(tenantId)

  const where = {
    tenant_id: tenantId,
    ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
  }

  const [rows, total] = await Promise.all([
    db.tfdPrestador.findMany({
      where,
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true,
        cnpj: true,
        cnes: true,
        telefone: true,
        especialidades: true,
        ativo: true,
        created_at: true,
      },
      orderBy: { nome: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.tfdPrestador.count({ where }),
  ])

  const allEspecialidadeIds = new Set<string>()
  for (const row of rows) {
    for (const espId of parseEspecialidadesJson(row.especialidades)) {
      allEspecialidadeIds.add(espId)
    }
  }

  const especialidadesRows =
    allEspecialidadeIds.size > 0
      ? await db.tfdEspecialidade.findMany({
          where: {
            tenant_id: tenantId,
            id: { in: [...allEspecialidadeIds] },
          },
          select: { id: true, nome: true },
        })
      : []

  const nomePorId = new Map(especialidadesRows.map((e) => [e.id, e.nome]))

  return {
    items: rows.map((row) => {
      const especialidadeIds = parseEspecialidadesJson(row.especialidades)
      return {
        id: row.id,
        nome: row.nome,
        cidade: row.cidade,
        estado: row.estado,
        cnpj: row.cnpj,
        cnes: row.cnes,
        telefone: row.telefone,
        especialidadeIds,
        especialidadeNomes: especialidadeIds.map((id) => nomePorId.get(id) ?? '—'),
        ativo: row.ativo,
        createdAt: row.created_at.toISOString(),
      }
    }),
    total,
    page,
    perPage,
  }
}
