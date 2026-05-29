import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdAgendamentoStatus, TfdTipoViagem } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'

export interface AgendamentoDisponivelViagemItem {
  id: string
  dataConsulta: string
  tipoAtendimento: string
  tipoViagem: TfdTipoViagem | null
  paciente: { nome: string }
  acompanhantesCount: number
}

export interface GetAgendamentosDisponiveisParaViagemOptions {
  /** Exclui agendamentos já vinculados a esta viagem. */
  viagemId?: string
  /** Reservado para compatibilidade; não restringe mais por data. */
  dataSaida?: string
}

function trechoJaVinculado(
  vinculos: Array<{ tipo_trecho: TfdTipoViagem }>,
  trecho: 'IDA' | 'VOLTA'
): boolean {
  return vinculos.some(
    (vinculo) =>
      vinculo.tipo_trecho === trecho ||
      vinculo.tipo_trecho === 'IDA_VOLTA'
  )
}

function trechoDisponivel(
  tipoViagemAgendamento: TfdTipoViagem | null,
  vinculos: Array<{ tipo_trecho: TfdTipoViagem }>
): boolean {
  const precisaIda =
    tipoViagemAgendamento === null ||
    tipoViagemAgendamento === 'IDA' ||
    tipoViagemAgendamento === 'IDA_VOLTA'
  const precisaVolta =
    tipoViagemAgendamento === null ||
    tipoViagemAgendamento === 'VOLTA' ||
    tipoViagemAgendamento === 'IDA_VOLTA'

  const idaDisponivel = precisaIda && !trechoJaVinculado(vinculos, 'IDA')
  const voltaDisponivel = precisaVolta && !trechoJaVinculado(vinculos, 'VOLTA')

  return idaDisponivel || voltaDisponivel
}

const STATUS_AGENDAMENTO_ELEGIVEIS: TfdAgendamentoStatus[] = ['AGENDADO']

export async function getAgendamentosDisponiveisParaViagem(
  processoId: string,
  options: GetAgendamentosDisponiveisParaViagemOptions = {}
): Promise<AgendamentoDisponivelViagemItem[]> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_VIAGEM)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const rows = await db.tfdAgendamento.findMany({
    where: {
      tenant_id: tenantId,
      processo_id: processoId,
      status: { in: STATUS_AGENDAMENTO_ELEGIVEIS },
      solicitacao: {
        status: { in: ['APROVADO', 'AGENDADO'] },
      },
      ...(options.viagemId
        ? {
            viagem_passageiros: {
              none: { viagem_id: options.viagemId },
            },
          }
        : {}),
    },
    select: {
      id: true,
      data_consulta: true,
      tipo_atendimento: true,
      tipo_viagem: true,
      solicitacao: {
        select: {
          paciente: { select: { nome: true } },
        },
      },
      acompanhantes_vinculos: { select: { id: true } },
      viagem_passageiros: {
        select: { tipo_trecho: true },
      },
    },
    orderBy: [{ data_consulta: 'asc' }, { sequencia: 'asc' }],
  })

  return rows
    .filter((row) => trechoDisponivel(row.tipo_viagem, row.viagem_passageiros))
    .map((row) => ({
      id: row.id,
      dataConsulta: row.data_consulta.toISOString().slice(0, 10),
      tipoAtendimento: row.tipo_atendimento,
      tipoViagem: row.tipo_viagem,
      paciente: { nome: row.solicitacao.paciente.nome },
      acompanhantesCount: row.acompanhantes_vinculos.length,
    }))
}
