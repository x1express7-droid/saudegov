import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { ProcessoStatus, TfdStatusSolicitacao } from '@prisma/client'

const MODULO_TFD = 'saude.tfd'

export const PROCESSO_STATUS_ABERTOS: ProcessoStatus[] = [
  'ABERTO',
  'EM_ANDAMENTO',
  'AGUARDANDO',
  'AGUARDANDO_COMPLEMENTO',
]

export const PROCESSO_STATUS_ENCERRADOS: ProcessoStatus[] = [
  'CONCLUIDO',
  'CANCELADO',
  'ARQUIVADO',
]

const SOLICITACAO_TERMINAIS: TfdStatusSolicitacao[] = ['CONCLUIDO', 'NEGADO', 'CANCELADO']

export interface ProcessoAbertoPacienteItem {
  processoId: string
  protocolo: string
  statusProcesso: ProcessoStatus
}

export interface ProcessoAbertoPacienteOutput {
  processos: ProcessoAbertoPacienteItem[]
  totalAbertos: number
}

export async function getProcessoAbertoPacienteTfd(
  pacienteId: string,
  excludeProcessoId?: string
): Promise<ProcessoAbertoPacienteOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId
  if (!tenantId) {
    throw new Error('Tenant não identificado para consulta de processo TFD.')
  }

  const db = await getPrismaForTenant(tenantId)

  const whereClause = {
    tenant_id: tenantId,
    modulo: MODULO_TFD,
    status: { in: PROCESSO_STATUS_ABERTOS },
    OR: [
      { paciente_id: pacienteId },
      {
        tfd_solicitacoes: {
          some: {
            paciente_id: pacienteId,
            status: { notIn: SOLICITACAO_TERMINAIS },
          },
        },
      },
    ],
    ...(session.user.role === 'SERVIDOR' && session.user.setorId
      ? { setor_id: session.user.setorId }
      : {}),
    ...(excludeProcessoId ? { id: { not: excludeProcessoId } } : {}),
  }

  const rows = await db.processo.findMany({
    where: whereClause,
    orderBy: { updated_at: 'desc' },
    select: {
      id: true,
      protocolo: true,
      status: true,
    },
  })

  if (rows.length === 0) {
    return null
  }

  return {
    processos: rows.map((row) => ({
      processoId: row.id,
      protocolo: row.protocolo,
      statusProcesso: row.status,
    })),
    totalAbertos: rows.length,
  }
}
