'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import {
  assertModuleActive,
  hasPermission,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog, type PrismaTransactionClient } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import type { TfdStatusSolicitacao } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import {
  resolveSaldoEstadoAlerta,
  tryNotificarSaldoBaixoAposMutacao,
} from '../utils/saldo-baixo-notificacao'
import { sumValorConsumidoLiquido } from '../utils/saldo-movimentacao'
import { calcSaldoDisponivel } from '../utils/saldo'
import {
  adicionarCustoPlanejadoSchema,
  atualizarCustoPlanejadoSchema,
  confirmarProjecaoFinanceiraSchema,
  excluirCustoPlanejadoSchema,
} from '../validators/projecao-financeira.schema'
import { registrarCustoComposicaoSolicitacaoSchema } from '../validators/composicao-custo.schema'

const MODULO_TFD = 'saude.tfd'
const STATUS_PERMITE_PLANEJAMENTO: TfdStatusSolicitacao[] = [
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
]

const STATUS_PERMITE_CONFIRMACAO: TfdStatusSolicitacao[] = ['APROVADO']

class ProjecaoFinanceiraBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjecaoFinanceiraBusinessError'
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function revalidateSolicitacaoPaths(solicitacaoId: string): void {
  revalidatePath('/saude/tfd/solicitacoes')
  revalidatePath(`/saude/tfd/${solicitacaoId}`)
  revalidatePath('/saude/tfd/configuracoes/saldos')
  revalidatePath('/saude/tfd/dashboard')
  revalidatePath('/saude/tfd/gestao')
}

type SaldoLockedRow = {
  id: string
  valor_total: Prisma.Decimal
}

async function lockSaldoForUpdate(
  tx: PrismaTransactionClient,
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

async function assertPodeEditarCustos(
  db: Awaited<ReturnType<typeof getPrismaForTenant>>,
  tenantId: string,
  solicitacaoId: string
): Promise<{ id: string; status: TfdStatusSolicitacao; protocolo: string }> {
  const solicitacao = await db.tfdSolicitacao.findFirst({
    where: { id: solicitacaoId, tenant_id: tenantId },
    select: {
      id: true,
      status: true,
      protocolo: true,
      reservas: {
        where: { status: 'ATIVA' },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!solicitacao) {
    throw new ProjecaoFinanceiraBusinessError('Solicitação não encontrada.')
  }

  if (!STATUS_PERMITE_PLANEJAMENTO.includes(solicitacao.status)) {
    throw new ProjecaoFinanceiraBusinessError(
      'Não é possível alterar custos neste status da solicitação.'
    )
  }

  if (solicitacao.reservas.length > 0) {
    throw new ProjecaoFinanceiraBusinessError(
      'A projeção financeira já foi confirmada e não pode ser alterada.'
    )
  }

  return {
    id: solicitacao.id,
    status: solicitacao.status,
    protocolo: solicitacao.protocolo,
  }
}

async function assertPodeConfirmarProjecao(
  db: Awaited<ReturnType<typeof getPrismaForTenant>>,
  tenantId: string,
  solicitacaoId: string
): Promise<{ id: string; status: TfdStatusSolicitacao; protocolo: string }> {
  const solicitacao = await db.tfdSolicitacao.findFirst({
    where: { id: solicitacaoId, tenant_id: tenantId },
    select: {
      id: true,
      status: true,
      protocolo: true,
      reservas: {
        where: { status: 'ATIVA' },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!solicitacao) {
    throw new ProjecaoFinanceiraBusinessError('Solicitação não encontrada.')
  }

  if (!STATUS_PERMITE_CONFIRMACAO.includes(solicitacao.status)) {
    throw new ProjecaoFinanceiraBusinessError(
      'A projeção financeira só pode ser confirmada após a aprovação da solicitação.'
    )
  }

  if (solicitacao.reservas.length > 0) {
    throw new ProjecaoFinanceiraBusinessError(
      'A projeção financeira já foi confirmada.'
    )
  }

  return {
    id: solicitacao.id,
    status: solicitacao.status,
    protocolo: solicitacao.protocolo,
  }
}

async function calcularDisponivelSaldo(
  tx: PrismaTransactionClient,
  tenantId: string,
  saldoId: string,
  valorTotalSaldo: number
): Promise<number> {
  const reservasAgg = await tx.tfdReservaSaldo.aggregate({
    where: {
      tenant_id: tenantId,
      saldo_id: saldoId,
      status: 'ATIVA',
    },
    _sum: { valor_estimado: true },
  })

  const valorConsumido = await sumValorConsumidoLiquido(tx, tenantId, saldoId)

  return calcSaldoDisponivel({
    valorTotal: valorTotalSaldo,
    valorReservado: Number(reservasAgg._sum.valor_estimado ?? 0),
    valorConsumido,
  }).valorDisponivel
}

function mapBusinessError<T = void>(error: unknown): ActionResponse<T> {
  if (error instanceof ProjecaoFinanceiraBusinessError) {
    return { success: false, error: error.message }
  }

  return {
    success: false,
    error: 'Não foi possível concluir a operação. Tente novamente.',
  }
}

export async function adicionarCustoPlanejadoSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ custoId: string }>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const parsed = adicionarCustoPlanejadoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { solicitacaoId, descricao, valor } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)
    const solicitacao = await assertPodeEditarCustos(db, tenantId, solicitacaoId)

    const custo = await db.tfdSolicitacaoCustoPlanejado.create({
      data: {
        tenant_id: tenantId,
        solicitacao_id: solicitacao.id,
        descricao,
        valor: roundMoney(valor),
      },
      select: { id: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_solicitacao_custo_planejado',
      entidadeId: custo.id,
      payloadDepois: {
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        descricao,
        valor: roundMoney(valor),
        modulo: MODULO_TFD,
      },
    })

    revalidateSolicitacaoPaths(solicitacaoId)
    return { success: true, data: { custoId: custo.id } }
  } catch (error) {
    console.error('[adicionarCustoPlanejadoSolicitacaoTfd] Erro:', error)
    return mapBusinessError(error) as ActionResponse<{ custoId: string }>
  }
}

export async function atualizarCustoPlanejadoSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const parsed = atualizarCustoPlanejadoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { custoId, descricao, valor } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const custo = await db.tfdSolicitacaoCustoPlanejado.findFirst({
      where: { id: custoId, tenant_id: tenantId },
      select: { id: true, solicitacao_id: true, descricao: true, valor: true },
    })

    if (!custo) {
      return { success: false, error: 'Custo não encontrado.' }
    }

    const solicitacao = await assertPodeEditarCustos(db, tenantId, custo.solicitacao_id)

    await db.tfdSolicitacaoCustoPlanejado.update({
      where: { id: custo.id, tenant_id: tenantId },
      data: {
        descricao,
        valor: roundMoney(valor),
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_solicitacao_custo_planejado',
      entidadeId: custo.id,
      payloadAntes: {
        descricao: custo.descricao,
        valor: Number(custo.valor),
      },
      payloadDepois: {
        descricao,
        valor: roundMoney(valor),
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        modulo: MODULO_TFD,
      },
    })

    revalidateSolicitacaoPaths(custo.solicitacao_id)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[atualizarCustoPlanejadoSolicitacaoTfd] Erro:', error)
    return mapBusinessError(error)
  }
}

export async function excluirCustoPlanejadoSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  if (
    !hasPermission(session, TFD_PERMISSIONS.REGISTRAR_DESPESA) &&
    !hasPermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)
  ) {
    return { success: false, error: 'Sem permissão para excluir custos da solicitação.' }
  }

  const parsed = excluirCustoPlanejadoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { custoId } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const custo = await db.tfdSolicitacaoCustoPlanejado.findFirst({
      where: { id: custoId, tenant_id: tenantId },
      select: { id: true, solicitacao_id: true, descricao: true, valor: true },
    })

    if (!custo) {
      return { success: false, error: 'Custo não encontrado.' }
    }

    const solicitacao = await assertPodeEditarCustos(db, tenantId, custo.solicitacao_id)

    await db.tfdSolicitacaoCustoPlanejado.delete({
      where: { id: custo.id, tenant_id: tenantId },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'DELETE',
      entidade: 'saude_tfd_solicitacao_custo_planejado',
      entidadeId: custo.id,
      payloadAntes: {
        descricao: custo.descricao,
        valor: Number(custo.valor),
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        modulo: MODULO_TFD,
      },
    })

    revalidateSolicitacaoPaths(custo.solicitacao_id)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[excluirCustoPlanejadoSolicitacaoTfd] Erro:', error)
    return mapBusinessError(error)
  }
}

export async function confirmarProjecaoFinanceiraSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

  const parsed = confirmarProjecaoFinanceiraSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { solicitacaoId, saldoId } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)
    const solicitacao = await assertPodeConfirmarProjecao(db, tenantId, solicitacaoId)

    const custos = await db.tfdSolicitacaoCustoPlanejado.findMany({
      where: { tenant_id: tenantId, solicitacao_id: solicitacaoId },
      select: { valor: true },
    })

    if (custos.length === 0) {
      return {
        success: false,
        error: 'Adicione pelo menos um custo antes de confirmar a projeção.',
      }
    }

    const valorTotal = roundMoney(custos.reduce((acc, item) => acc + Number(item.valor), 0))

    const estadoAntes = await resolveSaldoEstadoAlerta(db, tenantId, saldoId)
    if (!estadoAntes?.ativo) {
      return { success: false, error: 'Saldo não encontrado ou inativo.' }
    }

    await db.$transaction(async (tx) => {
      const saldoLocked = await lockSaldoForUpdate(tx, tenantId, saldoId)
      if (!saldoLocked) {
        throw new ProjecaoFinanceiraBusinessError('Saldo não encontrado ou inativo.')
      }

      const valorDisponivel = await calcularDisponivelSaldo(
        tx,
        tenantId,
        saldoId,
        Number(saldoLocked.valor_total)
      )

      if (roundMoney(valorTotal) > roundMoney(valorDisponivel)) {
        throw new ProjecaoFinanceiraBusinessError(
          `Saldo insuficiente. Disponível: ${formatMoeda(valorDisponivel)} · Projeção: ${formatMoeda(valorTotal)}.`
        )
      }

      const reserva = await tx.tfdReservaSaldo.create({
        data: {
          tenant_id: tenantId,
          saldo_id: saldoId,
          solicitacao_id: solicitacaoId,
          valor_estimado: valorTotal,
          status: 'ATIVA',
        },
        select: { id: true },
      })

      await tx.tfdMovimentacaoSaldo.create({
        data: {
          tenant_id: tenantId,
          saldo_id: saldoId,
          tipo: 'RESERVA',
          valor: valorTotal,
          solicitacao_id: solicitacaoId,
          descricao: `Reserva — projeção financeira da solicitação ${solicitacao.protocolo}`,
          usuario_id: session.user.id,
        },
      })

      await tx.tfdSolicitacao.update({
        where: { id: solicitacaoId, tenant_id: tenantId },
        data: { saldo_id: saldoId },
      })

      return reserva.id
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: solicitacaoId,
      payloadDepois: {
        acao: 'CONFIRMAR_PROJECAO_FINANCEIRA',
        saldoId,
        valorTotal,
        protocolo: solicitacao.protocolo,
        modulo: MODULO_TFD,
      },
    })

    await tryNotificarSaldoBaixoAposMutacao({
      tenantId,
      saldoId,
      jaEstavaEmAlertaBaixo: estadoAntes.alertaBaixo,
      excludeUserIds: [session.user.id],
    })

    revalidateSolicitacaoPaths(solicitacaoId)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[confirmarProjecaoFinanceiraSolicitacaoTfd] Erro:', error)
    return mapBusinessError(error)
  }
}

export async function registrarCustoComposicaoSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ custoId: string }>> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.REGISTRAR_DESPESA)

  const parsed = registrarCustoComposicaoSolicitacaoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { solicitacaoId, tipo, descricao, valor, quantidadeDias } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)
    const solicitacao = await assertPodeEditarCustos(db, tenantId, solicitacaoId)

    const custo = await db.tfdSolicitacaoCustoPlanejado.create({
      data: {
        tenant_id: tenantId,
        solicitacao_id: solicitacao.id,
        tipo,
        descricao: descricao?.trim() || null,
        quantidade_dias: quantidadeDias ?? null,
        valor: roundMoney(valor),
      },
      select: { id: true },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_solicitacao_custo_planejado',
      entidadeId: custo.id,
      payloadDepois: {
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        tipo,
        descricao: descricao ?? null,
        quantidadeDias: quantidadeDias ?? null,
        valor: roundMoney(valor),
        modulo: MODULO_TFD,
        origem: 'COMPOSICAO_SOLICITACAO',
      },
    })

    revalidateSolicitacaoPaths(solicitacaoId)
    return { success: true, data: { custoId: custo.id } }
  } catch (error) {
    console.error('[registrarCustoComposicaoSolicitacaoTfd] Erro:', error)
    return mapBusinessError(error)
  }
}

function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}
