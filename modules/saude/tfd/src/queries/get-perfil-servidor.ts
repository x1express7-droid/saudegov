import { assertModuleActive, maskCPF, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { PerfilServidorOutput } from '../types/tfd.types'
import { isCnhVencendoEmBreve, isCnhVencida } from '../utils/prazos'

export type { PerfilServidorOutput } from '../types/tfd.types'

function parsePermissions(raw: unknown): Record<string, boolean> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {}
  }

  const result: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'boolean') {
      result[key] = value
    }
  }
  return result
}

function podeConsultarPerfilServidor(
  sessionUserId: string,
  sessionRole: string,
  targetUserId: string
): boolean {
  if (sessionUserId === targetUserId) {
    return true
  }
  return sessionRole === 'ADMIN' || sessionRole === 'GESTOR'
}

export async function getPerfilServidor(userId: string): Promise<PerfilServidorOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  if (!podeConsultarPerfilServidor(session.user.id, session.user.role, userId)) {
    throw new Error('Sem permissão para visualizar o perfil deste servidor.')
  }

  const db = await getPrismaForTenant(tenantId)

  const usuario = await db.user.findFirst({
    where: {
      id: userId,
      tenant_id: tenantId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      matricula: true,
      phone: true,
      role: true,
      active: true,
      permissions: true,
      servidor_setores: {
        where: { ativo: true },
        select: {
          id: true,
          cargo: true,
          principal: true,
          ativo: true,
          setor: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
        orderBy: [{ principal: 'desc' }, { created_at: 'asc' }],
      },
      tfd_motoristas: {
        where: { ativo: true },
        take: 1,
        select: {
          cnh: true,
          cnh_categoria: true,
          cnh_validade: true,
        },
      },
    },
  })

  if (!usuario) {
    return null
  }

  const auditRows = await db.auditLog.findMany({
    where: {
      user_id: userId,
      tenant_id: tenantId,
    },
    orderBy: { created_at: 'desc' },
    take: 20,
    select: {
      acao: true,
      entidade: true,
      entidade_id: true,
      created_at: true,
    },
  })

  const motoristaRow = usuario.tfd_motoristas[0]

  return {
    id: usuario.id,
    nome: usuario.name,
    email: usuario.email,
    cpfMascarado: usuario.cpf ? maskCPF(usuario.cpf) : null,
    matricula: usuario.matricula,
    telefone: usuario.phone,
    role: usuario.role,
    ativo: usuario.active,
    permissions: parsePermissions(usuario.permissions),
    setores: usuario.servidor_setores.map((row) => ({
      id: row.id,
      setorId: row.setor.id,
      setorNome: row.setor.nome,
      cargo: row.cargo,
      principal: row.principal,
      ativo: row.ativo,
    })),
    motorista: motoristaRow
      ? {
          cnh: motoristaRow.cnh,
          cnhCategoria: motoristaRow.cnh_categoria,
          cnhValidade: motoristaRow.cnh_validade.toISOString().slice(0, 10),
          cnhVencida: isCnhVencida(motoristaRow.cnh_validade),
          cnhVencendoEmBreve: isCnhVencendoEmBreve(motoristaRow.cnh_validade),
        }
      : null,
    ultimasAcoes: auditRows.map((row) => ({
      acao: row.acao,
      entidade: row.entidade,
      entidadeId: row.entidade_id,
      createdAt: row.created_at.toISOString(),
    })),
  }
}
