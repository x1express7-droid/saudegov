'use server'

import { revalidatePath } from 'next/cache'
import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog, formatDateBrFromDate, registrarTramitacao } from '@saude/core-documents'
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
import {
  calcMinDataAgendamentoAposAprovacao,
  calcPrazoEnvioPrestacao,
} from '../utils/prazos'
import { podeEditarAgendamentoDados } from '../utils/agendamento-edicao'
import { gerarProtocoloTfd } from '../utils/gerar-protocolo-tfd'
import {
  adicionarAcompanhanteAgendamentoSchema,
  adicionarLocalAgendamentoSchema,
  atualizarAgendamentoSchema,
  cancelarAgendamentoSchema,
  criarAgendamentoNovoSchema,
  registrarRetornoAgendamentoSchema,
  removerAcompanhanteAgendamentoSchema,
  removerLocalAgendamentoSchema,
  type CriarAgendamentoNovoInput,
} from '../validators/agendamento-novo.schema'

const MODULO_TFD = 'saude.tfd'

const MSG_SOLICITACAO_NAO_ENCONTRADA = 'Solicitação não encontrada.'
const MSG_STATUS_SOLICITACAO_INVALIDO =
  'A solicitação precisa estar aprovada para criar um agendamento.'
const MSG_PROCESSO_INCONSISTENTE = 'A solicitação não pertence ao processo informado.'
const MSG_DATA_ANTES_APROVACAO =
  'A data e hora da consulta devem ser iguais ou posteriores à data de aprovação da solicitação.'
const MSG_AGENDAMENTO_NAO_ENCONTRADO = 'Agendamento não encontrado.'
const MSG_STATUS_RETORNO_INVALIDO =
  'O retorno só pode ser registrado para agendamentos com status Agendado ou Em viagem.'
const MSG_PRESTACAO_JA_EXISTE = 'A prestação de contas deste agendamento já foi iniciada.'
const MSG_STATUS_CANCELAR_INVALIDO =
  'Somente agendamentos com status Agendado podem ser cancelados.'
const MSG_PRESTADOR_INVALIDO = 'Prestador não encontrado ou inativo.'
const MSG_PROCEDIMENTO_INVALIDO = 'Procedimento não encontrado ou inativo.'
const MSG_ACOMPANHANTE_INVALIDO = 'Acompanhante não encontrado para esta solicitação.'
const MSG_AGENDAMENTO_DUPLICADO =
  'Já existe um agendamento para esta solicitação nesta data com este prestador.'
const MSG_LOCAL_NAO_ENCONTRADO = 'Local adicional não encontrado.'
const MSG_VINCULO_ACOMPANHANTE_NAO_ENCONTRADO =
  'Acompanhante não vinculado a este agendamento.'
const MSG_AGENDAMENTO_NAO_EDITAVEL =
  'Este agendamento não pode mais ser editado (somente antes da data da consulta e com status Agendado).'

type DbClient = Awaited<ReturnType<typeof getPrismaForTenant>>
type PrismaTx = Omit<DbClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>

function revalidateAgendamentoPaths(processoId: string, agendamentoId?: string) {
  revalidatePath('/saude/tfd')
  revalidatePath('/saude/tfd/agendamentos')
  revalidatePath(`/saude/tfd/processos/${processoId}`)
  if (agendamentoId) {
    revalidatePath(`/saude/tfd/processos/${processoId}/agendamentos/${agendamentoId}`)
  }
}

async function validarPrestadorAgendamento(
  tx: PrismaTx,
  tenantId: string,
  prestadorId: string | undefined
): Promise<boolean> {
  if (!prestadorId) {
    return true
  }

  const prestador = await tx.tfdPrestador.findFirst({
    where: {
      id: prestadorId,
      tenant_id: tenantId,
      ativo: true,
    },
    select: { id: true },
  })

  return Boolean(prestador)
}

async function validarProcedimentoAgendamento(
  tx: PrismaTx,
  tenantId: string,
  procedimentoId: string | undefined
): Promise<boolean> {
  if (!procedimentoId) {
    return true
  }

  const procedimento = await tx.tfdProcedimento.findFirst({
    where: {
      id: procedimentoId,
      tenant_id: tenantId,
      ativo: true,
    },
    select: { id: true },
  })

  return Boolean(procedimento)
}

async function validarAcompanhantesSolicitacao(
  tx: PrismaTx,
  tenantId: string,
  solicitacaoId: string,
  acompanhanteIds: string[]
): Promise<boolean> {
  if (acompanhanteIds.length === 0) {
    return true
  }

  const encontrados = await tx.tfdAcompanhante.count({
    where: {
      tenant_id: tenantId,
      solicitacao_id: solicitacaoId,
      id: { in: acompanhanteIds },
    },
  })

  return encontrados === acompanhanteIds.length
}

async function vincularAcompanhantesAgendamento(
  tx: PrismaTx,
  tenantId: string,
  agendamentoId: string,
  acompanhanteIds: string[]
): Promise<void> {
  if (acompanhanteIds.length === 0) {
    return
  }

  await tx.tfdAgendamentoAcompanhante.createMany({
    data: acompanhanteIds.map((acompanhanteId) => ({
      tenant_id: tenantId,
      agendamento_id: agendamentoId,
      acompanhante_id: acompanhanteId,
    })),
    skipDuplicates: true,
  })
}

async function criarLocaisAdicionaisAgendamento(
  tx: PrismaTx,
  tenantId: string,
  agendamentoId: string,
  locaisAdicionais: CriarAgendamentoNovoInput['locaisAdicionais']
): Promise<void> {
  if (!locaisAdicionais || locaisAdicionais.length === 0) {
    return
  }

  await tx.tfdAgendamentoLocal.createMany({
    data: locaisAdicionais.map((local, index) => ({
      tenant_id: tenantId,
      agendamento_id: agendamentoId,
      ordem: index + 1,
      prestador_id: local.prestadorId ?? null,
      procedimento_id: local.procedimentoId ?? null,
      horario: parseHoraConsultaUtc(local.horario),
      observacao: local.observacao ?? null,
    })),
  })
}

async function criarNovosAcompanhantesSolicitacao(
  tx: PrismaTx,
  tenantId: string,
  solicitacaoId: string,
  novosAcompanhantes: CriarAgendamentoNovoInput['novosAcompanhantes']
): Promise<string[]> {
  if (!novosAcompanhantes || novosAcompanhantes.length === 0) {
    return []
  }

  const ids: string[] = []

  for (const acompanhante of novosAcompanhantes) {
    const created = await tx.tfdAcompanhante.create({
      data: {
        tenant_id: tenantId,
        solicitacao_id: solicitacaoId,
        nome: acompanhante.nome,
        relacao: 'OUTRO',
        telefone: acompanhante.telefone ?? null,
      },
      select: { id: true },
    })
    ids.push(created.id)
  }

  return ids
}

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
        decidido_at: true,
        created_at: true,
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
      const prestadorValido = await validarPrestadorAgendamento(db, tenantId, data.prestadorId)
      if (!prestadorValido) {
        return { success: false, error: MSG_PRESTADOR_INVALIDO }
      }
    }

    if (data.acompanhanteIds.length > 0) {
      const acompanhantesValidos = await validarAcompanhantesSolicitacao(
        db,
        tenantId,
        data.solicitacaoId,
        data.acompanhanteIds
      )
      if (!acompanhantesValidos) {
        return { success: false, error: MSG_ACOMPANHANTE_INVALIDO }
      }
    }

    for (const local of data.locaisAdicionais) {
      if (local.prestadorId) {
        const prestadorValido = await validarPrestadorAgendamento(db, tenantId, local.prestadorId)
        if (!prestadorValido) {
          return { success: false, error: MSG_PRESTADOR_INVALIDO }
        }
      }

      if (local.procedimentoId) {
        const procedimentoValido = await validarProcedimentoAgendamento(
          db,
          tenantId,
          local.procedimentoId
        )
        if (!procedimentoValido) {
          return { success: false, error: MSG_PROCEDIMENTO_INVALIDO }
        }
      }
    }

    const dataConsultaDb = parseDataConsultaUtc(data.dataConsulta)

    const agendamentoDuplicado = await db.tfdAgendamento.findFirst({
      where: {
        tenant_id: tenantId,
        solicitacao_id: data.solicitacaoId,
        data_consulta: dataConsultaDb,
        prestador_id: data.prestadorId ?? null,
        status: { not: 'CANCELADO' },
      },
      select: { id: true },
    })

    if (agendamentoDuplicado) {
      return { success: false, error: MSG_AGENDAMENTO_DUPLICADO }
    }

    const inicioConsulta = buildInicioConsultaInstant(
      data.dataConsulta,
      data.horaConsulta,
      timezone
    )
    const dataReferenciaAprovacao = solicitacao.decidido_at ?? solicitacao.created_at
    const minimoPermitido = calcMinDataAgendamentoAposAprovacao(dataReferenciaAprovacao, timezone)
    if (inicioConsulta < minimoPermitido) {
      return { success: false, error: MSG_DATA_ANTES_APROVACAO }
    }

    const protocoloSolicitacao = solicitacao.protocolo
    const especialidadeNome = solicitacao.especialidade?.nome ?? 'Não informada'
    const horaConsultaDb = parseHoraConsultaUtc(data.horaConsulta)
    const acompanhantePrincipalId = data.acompanhanteIds[0] ?? null

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
          tipo_viagem: data.tipoViagem ?? null,
          convenio: data.convenio ?? null,
          acompanhante_id: acompanhantePrincipalId,
          orientacoes: data.orientacoes ?? null,
          status: 'AGENDADO',
        },
        select: {
          id: true,
          sequencia: true,
        },
      })

      const novosAcompanhanteIds = await criarNovosAcompanhantesSolicitacao(
        tx,
        tenantId,
        data.solicitacaoId,
        data.novosAcompanhantes
      )

      const todosAcompanhanteIds = [...new Set([...data.acompanhanteIds, ...novosAcompanhanteIds])]

      await vincularAcompanhantesAgendamento(
        tx,
        tenantId,
        agendamento.id,
        todosAcompanhanteIds
      )

      await criarLocaisAdicionaisAgendamento(
        tx,
        tenantId,
        agendamento.id,
        data.locaisAdicionais
      )

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
        convenio: data.convenio ?? null,
        tipoViagem: data.tipoViagem ?? null,
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

    revalidateAgendamentoPaths(data.processoId, resultado.agendamentoId)

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

      const dataConsultaLabel = formatDateBrFromDate(agendamentoLocked.data_consulta)
      const prazoEnvioLabel = formatDateBrFromDate(prazoEnvioAt)

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

export async function adicionarLocalAgendamento(
  rawInput: unknown
): Promise<ActionResponse<{ localId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.CRIAR_AGENDAMENTO)

  const parsed = adicionarLocalAgendamentoSchema.safeParse(rawInput)
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
        processo_id: true,
      },
    })

    if (!agendamento) {
      return { success: false, error: MSG_AGENDAMENTO_NAO_ENCONTRADO }
    }

    if (data.prestadorId) {
      const prestadorValido = await validarPrestadorAgendamento(db, tenantId, data.prestadorId)
      if (!prestadorValido) {
        return { success: false, error: MSG_PRESTADOR_INVALIDO }
      }
    }

    if (data.procedimentoId) {
      const procedimentoValido = await validarProcedimentoAgendamento(
        db,
        tenantId,
        data.procedimentoId
      )
      if (!procedimentoValido) {
        return { success: false, error: MSG_PROCEDIMENTO_INVALIDO }
      }
    }

    const resultado = await db.$transaction(async (tx) => {
      const maxOrdem = await tx.tfdAgendamentoLocal.aggregate({
        where: {
          tenant_id: tenantId,
          agendamento_id: data.agendamentoId,
        },
        _max: { ordem: true },
      })

      const local = await tx.tfdAgendamentoLocal.create({
        data: {
          tenant_id: tenantId,
          agendamento_id: data.agendamentoId,
          ordem: (maxOrdem._max.ordem ?? 0) + 1,
          prestador_id: data.prestadorId ?? null,
          procedimento_id: data.procedimentoId ?? null,
          horario: parseHoraConsultaUtc(data.horario),
          observacao: data.observacao ?? null,
        },
        select: { id: true },
      })

      return { localId: local.id, processoId: agendamento.processo_id }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_agendamento_local',
      entidadeId: resultado.localId,
      payloadDepois: {
        agendamentoId: data.agendamentoId,
        prestadorId: data.prestadorId ?? null,
        procedimentoId: data.procedimentoId ?? null,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidateAgendamentoPaths(resultado.processoId, data.agendamentoId)

    return { success: true, data: { localId: resultado.localId } }
  } catch (error) {
    console.error('[adicionarLocalAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível adicionar o local ao agendamento. Tente novamente.',
    }
  }
}

export async function removerLocalAgendamento(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.CRIAR_AGENDAMENTO)

  const parsed = removerLocalAgendamentoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const { localId } = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const local = await db.tfdAgendamentoLocal.findFirst({
      where: {
        id: localId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        agendamento_id: true,
        agendamento: {
          select: {
            processo_id: true,
          },
        },
      },
    })

    if (!local) {
      return { success: false, error: MSG_LOCAL_NAO_ENCONTRADO }
    }

    await db.tfdAgendamentoLocal.delete({
      where: { id: local.id },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'DELETE',
      entidade: 'saude_tfd_agendamento_local',
      entidadeId: local.id,
      payloadAntes: {
        agendamentoId: local.agendamento_id,
        modulo: MODULO_TFD,
        processoId: local.agendamento.processo_id,
      },
    })

    revalidateAgendamentoPaths(local.agendamento.processo_id, local.agendamento_id)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[removerLocalAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível remover o local do agendamento. Tente novamente.',
    }
  }
}

export async function adicionarAcompanhanteAgendamento(
  rawInput: unknown
): Promise<ActionResponse<{ acompanhanteId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.CRIAR_AGENDAMENTO)

  const parsed = adicionarAcompanhanteAgendamentoSchema.safeParse(rawInput)
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
        processo_id: true,
        solicitacao_id: true,
      },
    })

    if (!agendamento) {
      return { success: false, error: MSG_AGENDAMENTO_NAO_ENCONTRADO }
    }

    const resultado = await db.$transaction(async (tx) => {
      let acompanhanteId = data.acompanhanteId

      if (data.novoAcompanhante) {
        const created = await tx.tfdAcompanhante.create({
          data: {
            tenant_id: tenantId,
            solicitacao_id: agendamento.solicitacao_id,
            nome: data.novoAcompanhante.nome,
            relacao: 'OUTRO',
            telefone: data.novoAcompanhante.telefone ?? null,
          },
          select: { id: true },
        })
        acompanhanteId = created.id
      }

      if (!acompanhanteId) {
        throw new AgendamentoNovoBusinessError(MSG_ACOMPANHANTE_INVALIDO)
      }

      const acompanhanteValido = await validarAcompanhantesSolicitacao(
        tx,
        tenantId,
        agendamento.solicitacao_id,
        [acompanhanteId]
      )

      if (!acompanhanteValido) {
        throw new AgendamentoNovoBusinessError(MSG_ACOMPANHANTE_INVALIDO)
      }

      await tx.tfdAgendamentoAcompanhante.create({
        data: {
          tenant_id: tenantId,
          agendamento_id: agendamento.id,
          acompanhante_id: acompanhanteId,
        },
      })

      return {
        acompanhanteId,
        processoId: agendamento.processo_id,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_agendamento_acompanhante',
      entidadeId: `${data.agendamentoId}:${resultado.acompanhanteId}`,
      payloadDepois: {
        agendamentoId: data.agendamentoId,
        acompanhanteId: resultado.acompanhanteId,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidateAgendamentoPaths(resultado.processoId, data.agendamentoId)

    return { success: true, data: { acompanhanteId: resultado.acompanhanteId } }
  } catch (error) {
    if (error instanceof AgendamentoNovoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[adicionarAcompanhanteAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível adicionar o acompanhante ao agendamento. Tente novamente.',
    }
  }
}

export async function removerAcompanhanteAgendamento(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.CRIAR_AGENDAMENTO)

  const parsed = removerAcompanhanteAgendamentoSchema.safeParse(rawInput)
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

    const vinculo = await db.tfdAgendamentoAcompanhante.findFirst({
      where: {
        tenant_id: tenantId,
        agendamento_id: data.agendamentoId,
        acompanhante_id: data.acompanhanteId,
      },
      select: {
        id: true,
        agendamento: {
          select: {
            processo_id: true,
          },
        },
      },
    })

    if (!vinculo) {
      return { success: false, error: MSG_VINCULO_ACOMPANHANTE_NAO_ENCONTRADO }
    }

    await db.tfdAgendamentoAcompanhante.delete({
      where: { id: vinculo.id },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'DELETE',
      entidade: 'saude_tfd_agendamento_acompanhante',
      entidadeId: vinculo.id,
      payloadAntes: {
        agendamentoId: data.agendamentoId,
        acompanhanteId: data.acompanhanteId,
        modulo: MODULO_TFD,
        processoId: vinculo.agendamento.processo_id,
      },
    })

    revalidateAgendamentoPaths(vinculo.agendamento.processo_id, data.agendamentoId)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[removerAcompanhanteAgendamento] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível remover o acompanhante do agendamento. Tente novamente.',
    }
  }
}

export async function atualizarAgendamentoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.CRIAR_AGENDAMENTO)

  const parsed = atualizarAgendamentoSchema.safeParse(rawInput)
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

    const agendamento = await db.tfdAgendamento.findFirst({
      where: {
        id: data.agendamentoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        processo_id: true,
        solicitacao_id: true,
        sequencia: true,
        data_consulta: true,
        prestador_id: true,
        solicitacao: {
          select: {
            decidido_at: true,
            created_at: true,
          },
        },
      },
    })

    if (!agendamento) {
      return { success: false, error: MSG_AGENDAMENTO_NAO_ENCONTRADO }
    }

    const dataConsultaAtual = agendamento.data_consulta.toISOString().slice(0, 10)
    if (
      !podeEditarAgendamentoDados(agendamento.status, dataConsultaAtual, timezone)
    ) {
      return { success: false, error: MSG_AGENDAMENTO_NAO_EDITAVEL }
    }

    if (data.prestadorId) {
      const prestadorValido = await validarPrestadorAgendamento(db, tenantId, data.prestadorId)
      if (!prestadorValido) {
        return { success: false, error: MSG_PRESTADOR_INVALIDO }
      }
    }

    if (data.acompanhanteId) {
      const acompanhanteValido = await validarAcompanhantesSolicitacao(
        db,
        tenantId,
        agendamento.solicitacao_id,
        [data.acompanhanteId]
      )
      if (!acompanhanteValido) {
        return { success: false, error: MSG_ACOMPANHANTE_INVALIDO }
      }
    }

    const dataConsultaDb = parseDataConsultaUtc(data.dataConsulta)
    const prestadorIdNovo = data.prestadorId ?? null

    const agendamentoDuplicado = await db.tfdAgendamento.findFirst({
      where: {
        tenant_id: tenantId,
        solicitacao_id: agendamento.solicitacao_id,
        data_consulta: dataConsultaDb,
        prestador_id: prestadorIdNovo,
        status: { not: 'CANCELADO' },
        id: { not: agendamento.id },
      },
      select: { id: true },
    })

    if (agendamentoDuplicado) {
      return { success: false, error: MSG_AGENDAMENTO_DUPLICADO }
    }

    const inicioConsulta = buildInicioConsultaInstant(
      data.dataConsulta,
      data.horaConsulta,
      timezone
    )
    const dataReferenciaAprovacao =
      agendamento.solicitacao.decidido_at ?? agendamento.solicitacao.created_at
    const minimoPermitido = calcMinDataAgendamentoAposAprovacao(dataReferenciaAprovacao, timezone)
    if (inicioConsulta < minimoPermitido) {
      return { success: false, error: MSG_DATA_ANTES_APROVACAO }
    }

    const horaConsultaDb = parseHoraConsultaUtc(data.horaConsulta)
    const acompanhanteIdNovo = data.acompanhanteId ?? null

    await db.$transaction(async (tx) => {
      await tx.tfdAgendamento.update({
        where: { id: agendamento.id },
        data: {
          data_consulta: dataConsultaDb,
          hora_consulta: horaConsultaDb,
          prestador_id: prestadorIdNovo,
          profissional_nome: data.profissionalNome ?? null,
          tipo_atendimento: data.tipoAtendimento,
          tipo_viagem: data.tipoViagem ?? null,
          convenio: data.convenio ?? null,
          acompanhante_id: acompanhanteIdNovo,
          orientacoes: data.orientacoes ?? null,
        },
      })

      if (acompanhanteIdNovo) {
        await tx.tfdAgendamentoAcompanhante.createMany({
          data: [
            {
              tenant_id: tenantId,
              agendamento_id: agendamento.id,
              acompanhante_id: acompanhanteIdNovo,
            },
          ],
          skipDuplicates: true,
        })
      }

      const descricaoTramitacao =
        data.horaConsulta !== undefined
          ? `Agendamento ${agendamento.sequencia} atualizado para ${data.dataConsulta} às ${data.horaConsulta}.`
          : `Agendamento ${agendamento.sequencia} atualizado para ${data.dataConsulta}.`

      await registrarTramitacao(
        {
          tenantId,
          processoId: agendamento.processo_id,
          tipo: 'AGENDAMENTO',
          descricao: descricaoTramitacao,
          usuarioId: session.user.id,
          metadata: { agendamentoId: agendamento.id, acao: 'ATUALIZACAO' },
        },
        tx
      )
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_agendamento',
      entidadeId: agendamento.id,
      payloadDepois: {
        modulo: MODULO_TFD,
        processoId: agendamento.processo_id,
        dataConsulta: data.dataConsulta,
        horaConsulta: data.horaConsulta ?? null,
        prestadorId: prestadorIdNovo,
        tipoAtendimento: data.tipoAtendimento,
      },
    })

    revalidateAgendamentoPaths(agendamento.processo_id, agendamento.id)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarAgendamentoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível atualizar o agendamento. Tente novamente.',
    }
  }
}
