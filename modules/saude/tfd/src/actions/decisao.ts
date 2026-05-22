'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
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
import { calcSaldoDisponivel } from '../utils/saldo'
import { decidirSolicitacaoSchema } from '../validators/decisao.schema'

const MODULO_TFD = 'saude.tfd'

const MSG_SALDO_INSUFICIENTE = 'Saldo insuficiente para aprovação.'

type SaldoLockedRow = {
  id: string
  valor_total: Prisma.Decimal
}

class DecisaoBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DecisaoBusinessError'
  }
}

function revalidateSolicitacaoPaths(solicitacaoId: string): void {
  revalidatePath('/saude/tfd')
  revalidatePath(`/saude/tfd/${solicitacaoId}`)
}

async function lockSaldoForUpdate(
  tx: Prisma.TransactionClient,
  tenantId: string,
  saldoId: string
): Promise<SaldoLockedRow | null> {
  const rows = await tx.$queryRaw<SaldoLockedRow[]>(
    Prisma.sql`
      SELECT id, valor_total
      FROM saude_tfd.saldos
      WHERE id = ${saldoId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND ativo = true
      FOR UPDATE
    `
  )

  return rows[0] ?? null
}

async function calcularSaldoDisponivelLocked(
  tx: Prisma.TransactionClient,
  tenantId: string,
  saldoId: string,
  valorTotal: number
): Promise<number> {
  const [reservasAgg, consumosAgg] = await Promise.all([
    tx.tfdReservaSaldo.aggregate({
      where: {
        tenant_id: tenantId,
        saldo_id: saldoId,
        status: 'ATIVA',
      },
      _sum: { valor_estimado: true },
    }),
    tx.tfdMovimentacaoSaldo.aggregate({
      where: {
        tenant_id: tenantId,
        saldo_id: saldoId,
        tipo: 'CONSUMO',
      },
      _sum: { valor: true },
    }),
  ])

  const valorReservado = Number(reservasAgg._sum.valor_estimado ?? 0)
  const valorConsumido = Number(consumosAgg._sum.valor ?? 0)

  return calcSaldoDisponivel({
    valorTotal,
    valorReservado,
    valorConsumido,
  }).valorDisponivel
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

    if (data.decisao === 'NEGADO') {
      const resultado = await db.$transaction(async (tx) => {
        await tx.tfdSolicitacao.update({
          where: { id: solicitacao.id },
          data: {
            status: 'NEGADO',
            fundamentacao_decisao: data.fundamentacao,
            decidido_por_id: session.user.id,
            decidido_at: decididoAt,
          },
        })

        await tx.processo.update({
          where: { id: solicitacao.processo_id },
          data: { status: 'CONCLUIDO' },
        })

        await registrarTramitacao(
          {
            tenantId,
            processoId: solicitacao.processo_id,
            tipo: 'DECISAO',
            descricao: `Solicitação negada. ${data.fundamentacao}`,
            usuarioId: session.user.id,
            metadata: { decisao: 'NEGADO' },
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
          status: 'NEGADO',
          decisao: 'NEGADO',
          processoStatus: 'CONCLUIDO',
          protocolo,
          modulo: MODULO_TFD,
          processoId: resultado.processoId,
        },
      })

      await dispararNotificacao({
        tenantId,
        evento: NOTIFICATION_EVENTS.SOLICITACAO_TFD_NEGADA,
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
    }

    const saldoId = data.saldoId!
    const valorEstimado = data.valorEstimado!

    const resultado = await db.$transaction(async (tx) => {
      const saldoLocked = await lockSaldoForUpdate(tx, tenantId, saldoId)

      if (!saldoLocked) {
        throw new DecisaoBusinessError('Saldo financeiro não encontrado ou inativo.')
      }

      const valorTotal = Number(saldoLocked.valor_total)
      const saldoDisponivel = await calcularSaldoDisponivelLocked(
        tx,
        tenantId,
        saldoId,
        valorTotal
      )

      if (valorEstimado > saldoDisponivel) {
        throw new DecisaoBusinessError(MSG_SALDO_INSUFICIENTE)
      }

      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: {
          status: 'APROVADO',
          fundamentacao_decisao: data.fundamentacao,
          decidido_por_id: session.user.id,
          decidido_at: decididoAt,
          saldo_id: saldoId,
        },
      })

      await tx.processo.update({
        where: { id: solicitacao.processo_id },
        data: { status: 'EM_ANDAMENTO' },
      })

      await tx.tfdReservaSaldo.create({
        data: {
          tenant_id: tenantId,
          saldo_id: saldoId,
          solicitacao_id: solicitacao.id,
          valor_estimado: valorEstimado,
          status: 'ATIVA',
        },
      })

      await tx.tfdMovimentacaoSaldo.create({
        data: {
          tenant_id: tenantId,
          saldo_id: saldoId,
          tipo: 'RESERVA',
          valor: valorEstimado,
          solicitacao_id: solicitacao.id,
          descricao: 'Reserva automática — aprovação TFD',
          usuario_id: session.user.id,
        },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacao.processo_id,
          tipo: 'DECISAO',
          descricao: `Solicitação aprovada. ${data.fundamentacao}`,
          usuarioId: session.user.id,
          metadata: { decisao: 'APROVADO', saldoId, valorEstimado },
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
        status: 'APROVADO',
        decisao: 'APROVADO',
        saldoId,
        valorEstimado,
        processoStatus: 'EM_ANDAMENTO',
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.SOLICITACAO_TFD_APROVADA,
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
    if (error instanceof DecisaoBusinessError) {
      return { success: false, error: error.message }
    }

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
