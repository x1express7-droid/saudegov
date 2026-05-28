'use server'

import { revalidatePath } from 'next/cache'
import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog, registrarTramitacao } from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import type { AgendamentoNovoOutput } from '../types/tfd.types'
import {
  buildInicioConsultaInstant,
  parseDataConsultaUtc,
  parseHoraConsultaUtc,
  resolveTenantTimezone,
} from '../utils/agendamento-novo'
import { calcMinDataAgendamento72h, calcPrazoEnvioPrestacao } from '../utils/prazos'
import { gerarProtocoloTfd } from '../utils/gerar-protocolo-tfd'
import {
  cancelarAgendamentoSchema,
  criarAgendamentoNovoSchema,
  registrarRetornoAgendamentoSchema,
} from '../validators/agendamento-novo.schema'

const MODULO_TFD = 'saude.tfd'

const MSG_SOLICITACAO_NAO_ENCONTRADA = 'Solicitação não encontrada.'
const MSG_STATUS_SOLICITACAO_INVALIDO =
  'A solicitação precisa estar aprovada para criar um agendamento.'
const MSG_PROCESSO_INCONSISTENTE = 'A solicitação não pertence ao processo informado.'
const MSG_ANTECEDENCIA_72H =
  'A data e hora da consulta devem ser pelo menos 72 horas após o momento do agendamento.'
const MSG_AGENDAMENTO_NAO_ENCONTRADO = 'Agendamento não encontrado.'
const MSG_STATUS_RETORNO_INVALIDO =
  'O retorno só pode ser registrado para agendamentos com status Agendado ou Em viagem.'
const MSG_PRESTACAO_JA_EXISTE = 'A prestação de contas deste agendamento já foi iniciada.'
const MSG_STATUS_CANCELAR_INVALIDO =
  'Somente agendamentos com status Agendado podem ser cancelados.'
const MSG_PRESTADOR_INVALIDO = 'Prestador não encontrado ou inativo.'
const MSG_ACOMPANHANTE_INVALIDO = 'Acompanhante não encontrado para esta solicitação.'

class AgendamentoNovoBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgendamentoNovoBusinessError'
  }
}

export async function criarAgendamentoNovo(
  rawInput: unknown
): Promise<ActionResponse<AgendamentoNovoOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.CRIAR_AGENDAMENTO)

  const parsed = criarAgendamentoNovoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })
    const timezone = resolveTenantTimezone(tenant?.settings)

    const solicitacao = await db.tfdSolicitacao.findFirst({
      where: {
        id: data.solicitacaoId,
        tenant_id: tenantId,
        processo_id: data.processoId,
      },
      select: {
        id: true,
        status: true,
        processo_id: true,
        protocolo: true,
        urgencia: true,
        especialidade: { select: { nome: true } },
      },
    })

    if (!solicitacao) {
      return { success: false, error: MSG_SOLICITACAO_NAO_ENCONTRADA }
    }

    if (solicitacao.processo_id !== data.processoId) {
      return { success: false, error: MSG_PROCESSO_INCONSISTENTE }
    }

    if (solicitacao.status !== 'APROVADO') {
      return { success: false, error: MSG_STATUS_SOLICITACAO_INVALIDO }
    }

    if (data.prestadorId) {
      const prestador = await db.tfdPrestador.findFirst({
        where: {
          id: data.prestadorId,
          tenant_id: tenantId,
          ativo: true,
        },
        select: { id: true },
      })
      if (!prestador) {
        return { success: false, error: MSG_PRESTADOR_INVALIDO }
      }
    }

    if (data.acompanhanteId) {
      const acompanhante = await db.tfdAcompanhante.findFirst({
        where: {
          id: data.acompanhanteId,
          tenant_id: tenantId,
          solicitacao_id: data.solicitacaoId,
        },
        select: { id: true },
      })
      if (!acompanhante) {
        return { success: false, error: MSG_ACOMPANHANTE_INVALIDO }
      }
    }

    const inicioConsulta = buildInicioConsultaInstant(
      data.dataConsulta,
      data.horaConsulta,
      timezone
    )
    const minimoPermitido = calcMinDataAgendamento72h(new Date(), timezone)
    if (inicioConsulta < minimoPermitido) {
      return { success: false, error: MSG_ANTECEDENCIA_72H }
    }

    const protocoloSolicitacao = solicitacao.protocolo
    const especialidadeNome = solicitacao.especialidade?.nome ?? 'Não informada'
    const dataConsultaDb = parseDataConsultaUtc(data.dataConsulta)
    const horaConsultaDb = parseHoraConsultaUtc(data.horaConsulta)

    const resultado = await db.$transaction(async (tx) => {
      const maxSequencia = await tx.tfdAgendamento.aggregate({
        where: {
          tenant_id: tenantId,
          processo_id: data.processoId,
        },
        _max: { sequencia: true },
      })
      const sequencia = (maxSequencia._max.sequencia ?? 0) + 1
      const protocolo = await gerarProtocoloTfd(tenantId, 'AGENDAMENTO', tx)

      const agendamento = await tx.tfdAgendamento.create({
        data: {
          tenant_id: tenantId,
          processo_id: data.processoId,
          solicitacao_id: data.solicitacaoId,
          protocolo,
          sequencia,
          data_consulta: dataConsultaDb,
          hora_consulta: horaConsultaDb,
          prestador_id: data.prestadorId ?? null,
          profissional_nome: data.profissionalNome ?? null,
          tipo_atendimento: data.tipoAtendimento,
          acompanhante_id: data.acompanhanteId ?? null,
          orientacoes: data.orientacoes ?? null,
          status: 'AGENDADO',
        },
        select: {
          id: true,
          sequencia: true,
        },
      })

      await tx.tfdSolicitacao.update({
        where: { id: data.solicitacaoId },
        data: { status: 'AGENDADO' },
      })

      const descricaoTramitacao =
        data.horaConsulta !== undefined
          ? `Agendamento ${sequencia} registrado para ${data.dataConsulta} às ${data.horaConsulta}.`
          : `Agendamento ${sequencia} registrado para ${data.dataConsulta}.`

      await registrarTramitacao(
        {
          tenantId,
          processoId: data.processoId,
          tipo: 'AGENDAMENTO',
          descricao: descricaoTramitacao,
          usuarioId: session.user.id,
          metadata: {
            agendamentoId: agendamento.id,
            sequencia,
            dataConsulta: data.dataConsulta,
          },
        },
        tx
      )

      return {
        agendamentoId: agendamento.id,
        sequencia: agendamento.sequencia,
        processoId: data.processoId,
        solicitacaoId: data.solicitacaoId,
        protocolo,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_agendamento',
      entidadeId: resultado.agendamentoId,
      payloadDepois: {
        processoId: resultado.processoId,
        solicitacaoId: resultado.solicitacaoId,
        sequencia: resultado.sequencia,
        dataConsulta: data.dataConsulta,
        horaConsulta: data.horaConsulta ?? null,
        protocolo: resultado.protocolo,
        modulo: MODULO_TFD,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.AGENDAMENTO_TFD_CRIADO,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo: resultado.protocolo,
        especialidade: especialidadeNome,
        urgencia: solicitacao.urgencia,
      },
      excludeUserIds: [session.user.id],
    })

    revalidatePath('/saude/tfd')
    revalidatePath('/saude/tfd/agendamentos')
    revalidatePath(`/saude/tfd/processos/${data.processoId}`)

    return {
      success: true,
      data: {
        agendamentoId: resultado.agendamentoId,
        sequencia: resultado.sequencia,
      },
    }
  } catch (error) {
    if (error instanceof AgendamentoNovoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[criarAgendamentoNovo] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível criar o agendamento. Tente novamente.',
    }
  }
}

export async function registrarRetornoAgendamento(
  rawInput: unknown
): Promise<ActionResponse<{ prestacaoId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.REGISTRAR_RETORNO)

  const parsed = registrarRetornoAgendamentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const { agendamentoId } = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const agendamento = await db.tfdAgendamento.findFirst({
      where: {
        id: agendamentoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        data_consulta: true,
        sequencia: true,
        solicitacao_id: true,
        processo_id: true,
        protocolo: true,
        prestacao_conta: { select: { id: true } },
        solicitacao: {
          select: {
            saldo_id: true,
            solicitante_id: true,
            urgencia: true,
            especialidade: { select: { nome: true } },
          },
        },
        processo: { select: { aberto_por_id: true } },
      },
    })

    if (!agendamento) {
      return { success: false, error: MSG_AGENDAMENTO_NAO_ENCONTRADO }
    }

    if (agendamento.status !== 'AGENDADO' && agendamento.status !== 'EM_VIAGEM') {
      return { success: false, error: MSG_STATUS_RETORNO_INVALIDO }
    }

    if (agendamento.prestacao_conta) {
      return { success: false, error: MSG_PRESTACAO_JA_EXISTE }
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })
    const timezone = resolveTenantTimezone(tenant?.settings)
    const prazoEnvioAt = calcPrazoEnvioPrestacao(agendamento.data_consulta, timezone)
    const protocolo = agendamento.protocolo
    const especialidadeNome = agendamento.solicitacao.especialidade?.nome ?? 'Não informada'
    const servidorResponsavelId =
      agendamento.processo.aberto_por_id ?? agendamento.solicitacao.solicitante_id
    const realizadoAt = new Date()

    const resultado = await db.$transaction(async (tx) => {
      const agendamentoLocked = await tx.tfdAgendamento.findFirst({
        where: {
          id: agendamentoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          data_consulta: true,
          sequencia: true,
          solicitacao_id: true,
          processo_id: true,
          prestacao_conta: { select: { id: true } },
          solicitacao: {
            select: {
              saldo_id: true,
            },
          },
        },
      })

      if (!agendamentoLocked) {
        throw new AgendamentoNovoBusinessError(MSG_AGENDAMENTO_NAO_ENCONTRADO)
      }

      if (
        agendamentoLocked.status !== 'AGENDADO' &&
        agendamentoLocked.status !== 'EM_VIAGEM'
      ) {
        throw new AgendamentoNovoBusinessError(MSG_STATUS_RETORNO_INVALIDO)
      }

      if (agendamentoLocked.prestacao_conta) {
        throw new AgendamentoNovoBusinessError(MSG_PRESTACAO_JA_EXISTE)
      }

      await tx.tfdAgendamento.update({
        where: { id: agendamentoLocked.id },
        data: {
          status: 'REALIZADO',
          realizado_at: realizadoAt,
        },
      })

      const prestacao = await tx.tfdPrestacaoConta.create({
        data: {
          tenant_id: tenantId,
          agendamento_id: agendamentoLocked.id,
          viagem_id: null,
          saldo_id: agendamentoLocked.solicitacao.saldo_id,
          status: 'PENDENTE',
          prazo_envio_at: prazoEnvioAt,
        },
        select: { id: true },
      })

      const solicitacao = await tx.tfdSolicitacao.findFirst({
        where: {
          id: agendamentoLocked.solicitacao_id,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
        },
      })

      if (!solicitacao) {
        throw new AgendamentoNovoBusinessError(MSG_SOLICITACAO_NAO_ENCONTRADA)
      }

      const outrosAgendamentosPendentes = await tx.tfdAgendamento.count({
        where: {
          tenant_id: tenantId,
          processo_id: agendamentoLocked.processo_id,
          id: { not: agendamentoLocked.id },
          status: { in: ['AGENDADO', 'EM_VIAGEM'] },
        },
      })

      const statusSolicitacaoAnterior = solicitacao.status
      let statusSolicitacaoNovo = statusSolicitacaoAnterior

      if (outrosAgendamentosPendentes === 0) {
        await tx.tfdSolicitacao.update({
          where: { id: solicitacao.id },
          data: { status: 'AGUARDANDO_PC' },
        })
        statusSolicitacaoNovo = 'AGUARDANDO_PC'
      }

      const dataConsultaLabel = agendamentoLocked.data_consulta.toISOString().slice(0, 10)
      const prazoEnvioLabel = prazoEnvioAt.toISOString().slice(0, 10)

      await registrarTramitacao(
        {
          tenantId,
          processoId: agendamentoLocked.processo_id,
          tipo: 'RETORNO_REGISTRADO',
          descricao: `Retorno do agendamento ${agendamentoLocked.sequencia} registrado (${dataConsultaLabel}). Prestação de contas com prazo até ${prazoEnvioLabel}.`,
          usuarioId: session.user.id,
          metadata: {
            agendamentoId: agendamentoLocked.id,
            sequencia: agendamentoLocked.sequencia,
            prestacaoId: prestacao.id,
            prazoEnvioAt: prazoEnvioAt.toISOString(),
          },
        },
        tx
      )

      return {
        prestacaoId: prestacao.id,
        processoId: agendamentoLocked.processo_id,
        solicitacaoId: agendamentoLocked.solicitacao_id,
        sequencia: agendamentoLocked.sequencia,
        statusSolicitacaoAnterior,
        statusSolicitacaoNovo,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_agendamento',
      entidadeId: agendamentoId,
      payloadDepois: {
        status: 'REALIZADO',
        prestacaoId: resultado.prestacaoId,
        sequencia: resultado.sequencia,
        prazoEnvioAt: prazoEnvioAt.toISOString(),
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    if (resultado.statusSolicitacaoNovo !== resultado.statusSolicitacaoAnterior) {
      await createAuditLog({
        tenantId,
        userId: session.user.id,
        acao: 'UPDATE',
        entidade: 'saude_tfd_solicitacao',
        entidadeId: resultado.solicitacaoId,
        payloadAntes: { status: resultado.statusSolicitacaoAnterior },
        payloadDepois: {
          status: resultado.statusSolicitacaoNovo,
          agendamentoId,
          prestacaoId: resultado.prestacaoId,
          protocolo,
          modulo: MODULO_TFD,
          processoId: resultado.processoId,
        },
      })
    }

    if (servidorResponsavelId) {
      await dispararNotificacao({
        tenantId,
        evento: NOTIFICATION_EVENTS.RETORNO_REGISTRADO,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
        context: {
          protocolo,
          especialidade: especialidadeNome,
          urgencia: agendamento.solicitacao.urgencia,
        },
        recipientUserIds: [servidorResponsavelId],
        excludeUserIds: [session.user.id],
      })
    }

    revalidatePath('/saude/tfd')
    revalidatePath('/saude/tfd/agendamentos')

    return {
      success: true,
      data: { prestacaoId: resultado.prestacaoId },
    }
  } catch (error) {
    if (error instanceof AgendamentoNovoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[registrarRetornoAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar o retorno do agendamento. Tente novamente.',
    }
  }
}

export async function cancelarAgendamento(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.CANCELAR_PROCESSO)

  const parsed = cancelarAgendamentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const agendamento = await db.tfdAgendamento.findFirst({
      where: {
        id: data.agendamentoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        sequencia: true,
        processo_id: true,
        protocolo: true,
      },
    })

    if (!agendamento) {
      return { success: false, error: MSG_AGENDAMENTO_NAO_ENCONTRADO }
    }

    if (agendamento.status !== 'AGENDADO') {
      return { success: false, error: MSG_STATUS_CANCELAR_INVALIDO }
    }

    const canceladoAt = new Date()
    const protocolo = agendamento.protocolo

    await db.$transaction(async (tx) => {
      const locked = await tx.tfdAgendamento.findFirst({
        where: {
          id: data.agendamentoId,
          tenant_id: tenantId,
          status: 'AGENDADO',
        },
        select: {
          id: true,
          sequencia: true,
          processo_id: true,
        },
      })

      if (!locked) {
        throw new AgendamentoNovoBusinessError(MSG_STATUS_CANCELAR_INVALIDO)
      }

      await tx.tfdAgendamento.update({
        where: { id: locked.id },
        data: {
          status: 'CANCELADO',
          cancelado_at: canceladoAt,
          cancelado_por_id: session.user.id,
          motivo_cancelamento: data.motivoCancelamento,
        },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: locked.processo_id,
          tipo: 'CANCELAMENTO',
          descricao: `Agendamento ${locked.sequencia} cancelado.`,
          usuarioId: session.user.id,
          metadata: {
            agendamentoId: locked.id,
            sequencia: locked.sequencia,
          },
        },
        tx
      )
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_agendamento',
      entidadeId: data.agendamentoId,
      payloadDepois: {
        status: 'CANCELADO',
        protocolo,
        modulo: MODULO_TFD,
        processoId: agendamento.processo_id,
      },
    })

    revalidatePath('/saude/tfd')
    revalidatePath('/saude/tfd/agendamentos')

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof AgendamentoNovoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[cancelarAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível cancelar o agendamento. Tente novamente.',
    }
  }
}
