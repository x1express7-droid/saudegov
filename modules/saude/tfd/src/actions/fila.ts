'use server'

import { revalidatePath } from 'next/cache'

import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import { registrarMovimentacaoFila } from '../utils/fila'
import { moverPacienteNaFilaSchema } from '../validators/fila-movimentacao.schema'

const MODULO_TFD = 'saude.tfd'

const STATUS_FORA_FILA = new Set([
  'APROVADO',
  'NEGADO',
  'CANCELADO',
  'CONCLUIDO',
])

class FilaBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FilaBusinessError'
  }
}

export async function moverPacienteNaFila(
  rawInput: unknown
): Promise<ActionResponse<{ posicaoNova: number }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')

  await requirePermission(session, TFD_PERMISSIONS.MOVER_FILA)

  const parsed = moverPacienteNaFilaSchema.safeParse(rawInput)
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
        posicao_fila: true,
        processo_id: true,
      },
    })

    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' }
    }

    if (STATUS_FORA_FILA.has(solicitacao.status)) {
      return {
        success: false,
        error: 'Esta solicitação não está mais na fila de regulação.',
      }
    }

    if (solicitacao.posicao_fila === null) {
      return {
        success: false,
        error: 'A solicitação não possui posição na fila.',
      }
    }

    if (solicitacao.posicao_fila === data.posicaoNova) {
      return {
        success: false,
        error: 'A nova posição deve ser diferente da posição atual.',
      }
    }

    const posicaoAnterior = solicitacao.posicao_fila

    const resultado = await db.$transaction(async (tx) => {
      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: { posicao_fila: data.posicaoNova },
      })

      await registrarMovimentacaoFila(tx, {
        tenantId,
        solicitacaoId: solicitacao.id,
        usuarioId: session.user.id,
        tipo: data.tipoMovimentacao,
        posicaoAnterior,
        posicaoNova: data.posicaoNova,
        justificativa: data.justificativa,
      })

      return {
        solicitacaoId: solicitacao.id,
        processoId: solicitacao.processo_id,
        posicaoNova: data.posicaoNova,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: resultado.solicitacaoId,
      payloadAntes: { posicaoFila: posicaoAnterior },
      payloadDepois: {
        posicaoFila: resultado.posicaoNova,
        tipoMovimentacao: data.tipoMovimentacao,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    revalidatePath('/saude/tfd')
    revalidatePath(`/saude/tfd/${resultado.solicitacaoId}`)

    return { success: true, data: { posicaoNova: resultado.posicaoNova } }
  } catch (error) {
    if (error instanceof FilaBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[moverPacienteNaFila] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível alterar a posição na fila. Tente novamente.',
    }
  }
}
