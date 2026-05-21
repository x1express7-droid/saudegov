'use server'

import { revalidatePath } from 'next/cache'
import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
  type UserRole,
} from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog, registrarTramitacao } from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import {
  enviarComplementoSchema,
  iniciarAnaliseSchema,
  solicitarComplementoSchema,
} from '../validators/regulacao.schema'

const MODULO_TFD = 'saude.tfd'

const ROLES_ENVIO_COMPLEMENTO: UserRole[] = ['ADMIN', 'GESTOR', 'SUPERADMIN']

function revalidateSolicitacaoPaths(solicitacaoId: string): void {
  revalidatePath('/saude/tfd')
  revalidatePath(`/saude/tfd/${solicitacaoId}`)
}

function podeEnviarComplemento(
  role: UserRole,
  userId: string,
  solicitanteId: string
): boolean {
  if (ROLES_ENVIO_COMPLEMENTO.includes(role)) {
    return true
  }
  return userId === solicitanteId
}

export async function iniciarAnaliseTfd(rawInput: unknown): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ANALISAR_LAUDO)

  const parsed = iniciarAnaliseSchema.safeParse(rawInput)
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

    const solicitacao = await db.tfdSolicitacao.findFirst({
      where: {
        id: data.solicitacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        solicitante_id: true,
        processo_id: true,
        urgencia: true,
        especialidade: {
          select: { nome: true },
        },
        processo: {
          select: { protocolo: true },
        },
      },
    })

    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' }
    }

    if (solicitacao.status !== 'ENVIADO') {
      return { success: false, error: 'Transição inválida.' }
    }

    const protocolo = solicitacao.processo.protocolo
    const especialidadeNome = solicitacao.especialidade?.nome ?? 'Não informada'

    const resultado = await db.$transaction(async (tx) => {
      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: { status: 'EM_ANALISE' },
      })

      await tx.processo.update({
        where: { id: solicitacao.processo_id },
        data: { status: 'EM_ANDAMENTO' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacao.processo_id,
          tipo: 'ENCAMINHAMENTO',
          descricao: 'Análise iniciada.',
          usuarioId: session.user.id,
        },
        tx
      )

      return {
        solicitacaoId: solicitacao.id,
        processoId: solicitacao.processo_id,
        statusAnterior: 'ENVIADO' as const,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: resultado.solicitacaoId,
      payloadAntes: { status: resultado.statusAnterior },
      payloadDepois: {
        status: 'EM_ANALISE',
        processoStatus: 'EM_ANDAMENTO',
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.ANALISE_TFD_INICIADA,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo,
        especialidade: especialidadeNome,
        urgencia: solicitacao.urgencia,
      },
      excludeUserIds: [session.user.id],
    })

    revalidateSolicitacaoPaths(resultado.solicitacaoId)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[iniciarAnaliseTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível iniciar a análise. Tente novamente.',
    }
  }
}

export async function solicitarComplementoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.SOLICITAR_COMPLEMENTO)

  const parsed = solicitarComplementoSchema.safeParse(rawInput)
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

    const solicitacao = await db.tfdSolicitacao.findFirst({
      where: {
        id: data.solicitacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        solicitante_id: true,
        processo_id: true,
        urgencia: true,
        especialidade: {
          select: { nome: true },
        },
        processo: {
          select: { protocolo: true },
        },
      },
    })

    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' }
    }

    if (solicitacao.status !== 'EM_ANALISE') {
      return { success: false, error: 'Transição inválida.' }
    }

    const protocolo = solicitacao.processo.protocolo
    const especialidadeNome = solicitacao.especialidade?.nome ?? 'Não informada'

    const resultado = await db.$transaction(async (tx) => {
      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: { status: 'PENDENTE' },
      })

      await tx.processo.update({
        where: { id: solicitacao.processo_id },
        data: { status: 'AGUARDANDO_COMPLEMENTO' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacao.processo_id,
          tipo: 'COMPLEMENTO_SOLICITADO',
          descricao: data.mensagem,
          usuarioId: session.user.id,
        },
        tx
      )

      return {
        solicitacaoId: solicitacao.id,
        processoId: solicitacao.processo_id,
        statusAnterior: 'EM_ANALISE' as const,
        solicitanteId: solicitacao.solicitante_id,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: resultado.solicitacaoId,
      payloadAntes: { status: resultado.statusAnterior },
      payloadDepois: {
        status: 'PENDENTE',
        processoStatus: 'AGUARDANDO_COMPLEMENTO',
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.COMPLEMENTO_TFD_SOLICITADO,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo,
        especialidade: especialidadeNome,
        urgencia: solicitacao.urgencia,
      },
      recipientUserIds: [resultado.solicitanteId],
    })

    revalidateSolicitacaoPaths(resultado.solicitacaoId)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[solicitarComplementoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível solicitar o complemento. Tente novamente.',
    }
  }
}

export async function enviarComplementoTfd(rawInput: unknown): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  const parsed = enviarComplementoSchema.safeParse(rawInput)
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

    const solicitacao = await db.tfdSolicitacao.findFirst({
      where: {
        id: data.solicitacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        solicitante_id: true,
        processo_id: true,
        urgencia: true,
        especialidade: {
          select: { nome: true },
        },
        processo: {
          select: { protocolo: true },
        },
      },
    })

    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' }
    }

    if (!podeEnviarComplemento(session.user.role, session.user.id, solicitacao.solicitante_id)) {
      return {
        success: false,
        error: 'Sem permissão para enviar complemento.',
      }
    }

    if (solicitacao.status !== 'PENDENTE') {
      return { success: false, error: 'Transição inválida.' }
    }

    const protocolo = solicitacao.processo.protocolo
    const especialidadeNome = solicitacao.especialidade?.nome ?? 'Não informada'

    const resultado = await db.$transaction(async (tx) => {
      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: { status: 'EM_ANALISE' },
      })

      await tx.processo.update({
        where: { id: solicitacao.processo_id },
        data: { status: 'EM_ANDAMENTO' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacao.processo_id,
          tipo: 'COMPLEMENTO_ENVIADO',
          descricao: data.texto,
          usuarioId: session.user.id,
        },
        tx
      )

      return {
        solicitacaoId: solicitacao.id,
        processoId: solicitacao.processo_id,
        statusAnterior: 'PENDENTE' as const,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: resultado.solicitacaoId,
      payloadAntes: { status: resultado.statusAnterior },
      payloadDepois: {
        status: 'EM_ANALISE',
        processoStatus: 'EM_ANDAMENTO',
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.COMPLEMENTO_TFD_ENVIADO,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo,
        especialidade: especialidadeNome,
        urgencia: solicitacao.urgencia,
      },
      excludeUserIds: [session.user.id],
    })

    revalidateSolicitacaoPaths(resultado.solicitacaoId)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[enviarComplementoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível enviar o complemento. Tente novamente.',
    }
  }
}
