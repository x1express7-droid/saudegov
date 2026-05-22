import {
  assertModuleActive,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'

import { TFD_PERMISSIONS } from '../permissions'
import type { TfdSolicitacaoDetalhe } from '../types/tfd.types'

const MODULO_TFD = 'saude.tfd'

function parseProcedimentoIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function formatDateOnly(date: Date | null): string | null {
  if (!date) {
    return null
  }
  return date.toISOString().slice(0, 10)
}

export async function getSolicitacaoTfd(solicitacaoId: string): Promise<TfdSolicitacaoDetalhe | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const processoWhere =
    session.user.role === 'SERVIDOR' && session.user.setorId
      ? { setor_id: session.user.setorId }
      : {}

  const row = await db.tfdSolicitacao.findFirst({
    where: {
      id: solicitacaoId,
      tenant_id: tenantId,
      ...(Object.keys(processoWhere).length > 0 ? { processo: processoWhere } : {}),
    },
    select: {
      id: true,
      status: true,
      urgencia: true,
      tipo_atendimento: true,
      created_at: true,
      updated_at: true,
      procedimentos: true,
      solicitacao_origem_id: true,
      laudo_anexo_id: true,
      cid_principal: true,
      diagnostico: true,
      especialidade: {
        select: { id: true, nome: true },
      },
      prestador: {
        select: { id: true, nome: true, cidade: true, estado: true },
      },
      paciente: {
        select: {
          id: true,
          nome: true,
          data_nascimento: true,
          cns: true,
        },
      },
      solicitante: {
        select: { id: true, name: true },
      },
      acompanhantes: {
        select: { nome: true, relacao: true },
        take: 1,
      },
      processo: {
        select: { protocolo: true, id: true },
      },
      reservas: {
        orderBy: { created_at: 'desc' },
        take: 1,
        select: {
          id: true,
          valor_estimado: true,
          status: true,
        },
      },
    },
  })

  if (!row) {
    return null
  }

  const procedimentoIds = parseProcedimentoIds(row.procedimentos)
  const procedimentosRows =
    procedimentoIds.length > 0
      ? await db.tfdProcedimento.findMany({
          where: {
            tenant_id: tenantId,
            id: { in: procedimentoIds },
          },
          select: { id: true, nome: true },
        })
      : []

  const tramitacaoWhere =
    session.user.role === 'SERVIDOR'
      ? { visivel_servidor: true }
      : {}

  const tramitacoesRows = await db.tramitacao.findMany({
    where: {
      tenant_id: tenantId,
      processo_id: row.processo.id,
      ...tramitacaoWhere,
    },
    select: {
      tipo: true,
      descricao: true,
      created_at: true,
      usuario: {
        select: { name: true },
      },
    },
    orderBy: { created_at: 'asc' },
  })

  const reserva = row.reservas[0] ?? null
  const acompanhanteRow = row.acompanhantes[0] ?? null

  const podeVerDadosClinicos = hasPermission(session, TFD_PERMISSIONS.ANALISAR_LAUDO)

  const detalhe: TfdSolicitacaoDetalhe = {
    id: row.id,
    processoId: row.processo.id,
    protocolo: row.processo.protocolo,
    status: row.status,
    urgencia: row.urgencia,
    tipoAtendimento: row.tipo_atendimento,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    especialidade: row.especialidade,
    procedimentos: procedimentosRows.map((item) => ({
      id: item.id,
      nome: item.nome,
    })),
    prestador: row.prestador,
    paciente: {
      id: row.paciente.id,
      nome: row.paciente.nome,
      dataNascimento: formatDateOnly(row.paciente.data_nascimento),
      cns: row.paciente.cns,
    },
    acompanhante: acompanhanteRow
      ? {
          nome: acompanhanteRow.nome,
          relacao: acompanhanteRow.relacao,
        }
      : null,
    solicitante: {
      id: row.solicitante.id,
      nome: row.solicitante.name,
    },
    tramitacoes: tramitacoesRows.map((item) => ({
      tipo: item.tipo,
      observacao: item.descricao,
      createdAt: item.created_at.toISOString(),
      usuario: { nome: item.usuario?.name ?? null },
    })),
    laudoAnexoId: row.laudo_anexo_id,
    solicitacaoOrigemId: row.solicitacao_origem_id,
    reservaSaldo: reserva
      ? {
          id: reserva.id,
          valor: Number(reserva.valor_estimado),
          status: reserva.status,
        }
      : null,
  }

  if (podeVerDadosClinicos) {
    detalhe.cidPrincipal = row.cid_principal
    detalhe.diagnostico = row.diagnostico
    detalhe.observacoesClinicas = null

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'READ_SENSITIVE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: row.id,
      payloadDepois: {
        modulo: MODULO_TFD,
        campos: ['cid_principal', 'diagnostico'],
      },
    })
  }

  return detalhe
}
