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
import { registrarSaidaFila } from '../utils/fila'
import { decidirSolicitacaoSchema } from '../validators/decisao.schema'

const MODULO_TFD = 'saude.tfd'

function revalidateSolicitacaoPaths(solicitacaoId: string): void {
  revalidatePath('/saude/tfd')
  revalidatePath(`/saude/tfd/${solicitacaoId}`)
}

export async function decidirSolicitacaoTfd(rawInput: unknown): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')

  await requirePermission(session, TFD_PERMISSIONS.DECIDIR_SOLICITACAO)

  const parsed = decidirSolicitacaoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  if (data.fundamentacao.length < 20) {
    return {
      success: false,
      error: 'A fundamentação deve ter pelo menos 20 caracteres.',
    }
  }

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
    const decididoAt = new Date()

    const aprovado = data.decisao === 'APROVADO'
    const novoStatusSolicitacao = aprovado ? 'APROVADO' : 'NEGADO'
    const novoStatusProcesso = aprovado ? 'EM_ANDAMENTO' : 'CONCLUIDO'

    const resultado = await db.$transaction(async (tx) => {
      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: {
          status: novoStatusSolicitacao,
          fundamentacao_decisao: data.fundamentacao,
          decidido_por_id: session.user.id,
          decidido_at: decididoAt,
        },
      })

      await tx.processo.update({
        where: { id: solicitacao.processo_id },
        data: { status: novoStatusProcesso },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacao.processo_id,
          tipo: 'DECISAO',
          descricao: `${aprovado ? 'Solicitação aprovada.' : 'Solicitação negada.'} ${data.fundamentacao}`,
          usuarioId: session.user.id,
          metadata: { decisao: data.decisao },
        },
        tx
      )

      await registrarSaidaFila(tx, {
        tenantId,
        solicitacaoId: solicitacao.id,
        usuarioId: session.user.id,
        justificativa: aprovado
          ? 'Saída da fila — solicitação aprovada na regulação.'
          : 'Saída da fila — solicitação negada na regulação.',
      })

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
        status: novoStatusSolicitacao,
        decisao: data.decisao,
        processoStatus: novoStatusProcesso,
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: aprovado
        ? NOTIFICATION_EVENTS.SOLICITACAO_TFD_APROVADA
        : NOTIFICATION_EVENTS.SOLICITACAO_TFD_NEGADA,
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
    console.error('[decidirSolicitacaoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a decisão. Tente novamente.',
    }
  }
}
