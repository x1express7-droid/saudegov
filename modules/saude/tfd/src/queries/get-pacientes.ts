import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { TfdPacienteVinculadoItem } from '../types/tfd.types'

const MAX_PER_PAGE = 100
const DEFAULT_PER_PAGE = 20

export interface GetPacientesFiltros {
  /** Busca parcial no nome (case-insensitive). */
  nome?: string
  page?: number
  perPage?: number
}

function maskCns(cns: string): string {
  if (cns.length < 7) {
    return '***'
  }
  return `${cns.slice(0, 3)}•••••••••••${cns.slice(-4)}`
}

type PacienteRow = {
  id: string
  nome: string
  cns: string | null
  ativo: boolean
  created_at: Date
}

function mapToItem(row: PacienteRow): TfdPacienteVinculadoItem {
  return {
    id: row.id,
    nome: row.nome,
    cnsMascarado: row.cns ? maskCns(row.cns) : null,
    vinculadoEm: row.created_at.toISOString(),
    ativo: row.ativo,
  }
}

export async function getPacientesTfd(
  filtros: GetPacientesFiltros = {}
): Promise<{ items: TfdPacienteVinculadoItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId
  if (!tenantId) {
    throw new Error('Tenant não identificado para listagem de pacientes.')
  }

  const page = Math.max(1, filtros.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filtros.perPage ?? DEFAULT_PER_PAGE))
  const skip = (page - 1) * perPage

  const nome = filtros.nome?.trim()

  const db = await getPrismaForTenant(tenantId)

  const where = {
    tenant_id: tenantId,
    ...(nome
      ? {
          nome: {
            contains: nome,
            mode: 'insensitive' as const,
          },
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    db.paciente.findMany({
      where,
      orderBy: [{ nome: 'asc' }],
      skip,
      take: perPage,
      select: {
        id: true,
        nome: true,
        cns: true,
        ativo: true,
        created_at: true,
      },
    }),
    db.paciente.count({ where }),
  ])

  return {
    items: rows.map(mapToItem),
    total,
  }
}
