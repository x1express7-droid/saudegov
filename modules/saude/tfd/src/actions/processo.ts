'use server'

import { revalidatePath } from 'next/cache'

import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import { salvarDadosClinicosSchema } from '../validators/processo-dados-clinicos.schema'

const MODULO_TFD = 'saude.tfd'

class ProcessoBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProcessoBusinessError'
  }
}

export async function salvarDadosClinicosTfd(
  rawInput: unknown
): Promise<ActionResponse<{ processoId: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.REGISTRAR_DADOS_CLINICOS)

  const parsed = salvarDadosClinicosSchema.safeParse(rawInput)
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

    const processo = await db.processo.findFirst({
      where: {
        id: data.processoId,
        tenant_id: tenantId,
        modulo: MODULO_TFD,
      },
      select: { id: true },
    })

    if (!processo) {
      return { success: false, error: 'Processo TFD não encontrado.' }
    }

    const payload = {
      subjetivo: data.subjetivo ?? null,
      objetivo: data.objetivo ?? null,
      avaliacao: data.avaliacao ?? null,
      plano: data.plano ?? null,
      motivo_quadro: data.motivoQuadro ?? null,
      observacao: data.observacao ?? null,
      registrado_por_id: session.user.id,
    }

    const resultado = await db.$transaction(async (tx) => {
      const existente = await tx.tfdProcessoDadosClinicos.findUnique({
        where: { processo_id: processo.id },
        select: { id: true },
      })

      if (existente) {
        await tx.tfdProcessoDadosClinicos.update({
          where: { processo_id: processo.id },
          data: payload,
        })
        return { id: existente.id, processoId: processo.id, created: false }
      }

      const criado = await tx.tfdProcessoDadosClinicos.create({
        data: {
          tenant_id: tenantId,
          processo_id: processo.id,
          ...payload,
        },
        select: { id: true },
      })

      return { id: criado.id, processoId: processo.id, created: true }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: resultado.created ? 'CREATE' : 'UPDATE',
      entidade: 'saude_tfd_processo_dados_clinicos',
      entidadeId: resultado.id,
      payloadDepois: {
        processoId: resultado.processoId,
        modulo: MODULO_TFD,
      },
    })

    revalidatePath('/saude/tfd')
    revalidatePath(`/saude/tfd/${resultado.processoId}`)

    return { success: true, data: { processoId: resultado.processoId } }
  } catch (error) {
    if (error instanceof ProcessoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[salvarDadosClinicosTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível salvar os dados clínicos. Tente novamente.',
    }
  }
}
