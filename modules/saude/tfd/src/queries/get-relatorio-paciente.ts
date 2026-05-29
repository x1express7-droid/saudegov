import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type {
  PacienteRelatorioBuscaItem,
  RelatorioPacienteData,
  RelatorioPacienteInput,
} from '../types/tfd.types'

/**
 * Histórico de solicitações do paciente — sem dados clínicos.
 */
export async function getRelatorioPacienteTfd(
  input: RelatorioPacienteInput
): Promise<RelatorioPacienteData> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const paciente = await db.paciente.findFirst({
    where: {
      id: input.pacienteId,
      tenant_id: tenantId,
    },
    select: { id: true, nome: true },
  })

  if (!paciente) {
    throw new Error('Paciente não encontrado.')
  }

  const rows = await db.tfdSolicitacao.findMany({
    where: {
      tenant_id: tenantId,
      paciente_id: input.pacienteId,
      status: { not: 'RASCUNHO' },
    },
    select: {
      status: true,
      protocolo: true,
      created_at: true,
      decidido_at: true,
      especialidade: { select: { nome: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return {
    paciente: { id: paciente.id, nome: paciente.nome },
    itens: rows.map((row) => ({
      protocolo: row.protocolo,
      especialidade: row.especialidade?.nome ?? '—',
      status: row.status,
      criadoEm: row.created_at.toISOString(),
      decididoEm: row.decidido_at?.toISOString() ?? null,
    })),
  }
}

/**
 * Busca pacientes por nome ou protocolo de solicitação (para seleção no relatório).
 */
export async function buscarPacienteRelatorioTfd(termo: string): Promise<PacienteRelatorioBuscaItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const trimmed = termo.trim()
  if (trimmed.length < 2) {
    return []
  }

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const [porNome, porProtocolo] = await Promise.all([
    db.paciente.findMany({
      where: {
        tenant_id: tenantId,
        nome: { contains: trimmed, mode: 'insensitive' },
      },
      select: { id: true, nome: true },
      take: 15,
      orderBy: { nome: 'asc' },
    }),
    db.tfdSolicitacao.findMany({
      where: {
        tenant_id: tenantId,
        protocolo: { contains: trimmed, mode: 'insensitive' },
      },
      select: {
        paciente: { select: { id: true, nome: true } },
      },
      take: 15,
    }),
  ])

  const map = new Map<string, PacienteRelatorioBuscaItem>()

  for (const paciente of porNome) {
    map.set(paciente.id, { id: paciente.id, nome: paciente.nome })
  }

  for (const row of porProtocolo) {
    map.set(row.paciente.id, { id: row.paciente.id, nome: row.paciente.nome })
  }

  return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
