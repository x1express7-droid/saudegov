import { notFound } from 'next/navigation'
import { requireTenantRole, requirePermission } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { CONFIG_PERMISSIONS } from '../permissions'
import {
  TENANT_STAFF_ROLES,
  type ServidorDetail,
  type ServidorRole,
  type ServidorSetorVinculo,
} from '../types/servidores.types'

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

export async function getServidor(id: string): Promise<ServidorDetail> {
  const session = await requireTenantRole('ADMIN')
  await requirePermission(session, CONFIG_PERMISSIONS.SERVIDORES)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const row = await db.user.findFirst({
    where: {
      id,
      tenant_id: tenantId,
      role: { in: [...TENANT_STAFF_ROLES] },
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
  })

  if (!row || !row.cpf) {
    notFound()
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cpf: row.cpf,
    matricula: row.matricula,
    role: row.role as ServidorRole,
    active: row.active,
    setores: row.servidor_setores.map(mapSetorVinculo),
  }
}
