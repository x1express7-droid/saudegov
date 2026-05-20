import { maskCPF, requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import type { ServidorListItem, ServidorRole, ServidorSetorVinculo } from '../types/servidores.types'

const SERVIDOR_ROLES = ['GESTOR', 'SERVIDOR'] as ('GESTOR' | 'SERVIDOR')[]

interface Filtros {
  incluirInativos?: boolean
}

function mapSetorVinculo(row: {
  setor_id: string
  cargo: string | null
  principal: boolean
  setor: {
    nome: string
    sigla: string | null
    departamento: { nome: string }
  }
}): ServidorSetorVinculo {
  return {
    setorId: row.setor_id,
    setorNome: row.setor.nome,
    setorSigla: row.setor.sigla,
    departamentoNome: row.setor.departamento.nome,
    cargo: row.cargo,
    principal: row.principal,
  }
}

export async function getServidores(filtros: Filtros = {}): Promise<ServidorListItem[]> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.SERVIDORES)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.user.findMany({
    where: {
      tenant_id: tenantId,
      role: { in: SERVIDOR_ROLES },
      ...(filtros.incluirInativos ? {} : { active: true }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      matricula: true,
      role: true,
      active: true,
      servidor_setores: {
        where: { tenant_id: tenantId, ativo: true },
        select: {
          setor_id: true,
          cargo: true,
          principal: true,
          setor: {
            select: {
              nome: true,
              sigla: true,
              departamento: { select: { nome: true } },
            },
          },
        },
        orderBy: [{ principal: 'desc' }, { created_at: 'asc' }],
      },
    },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    cpfMascarado: row.cpf ? maskCPF(row.cpf) : '—',
    matricula: row.matricula,
    role: row.role as ServidorRole,
    active: row.active,
    setores: row.servidor_setores.map(mapSetorVinculo),
  }))
}
