import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { ProcessoFinanceiroOutput } from '../types/tfd.types'

const MODULO_TFD = 'saude.tfd'

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function assertProcessoAcessivelSetor(
  role: string,
  setorId: string | null | undefined,
  processoSetorId: string | null
): boolean {
  if (role !== 'SERVIDOR') {
    return true
  }
  if (!setorId) {
    return false
  }
  return processoSetorId === setorId
}

export async function getProcessoFinanceiroTfd(
  processoId: string
): Promise<ProcessoFinanceiroOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const processo = await db.processo.findFirst({
    where: {
      id: processoId,
      tenant_id: tenantId,
      modulo: MODULO_TFD,
    },
    select: {
      id: true,
      setor_id: true,
      tfd_solicitacoes: {
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          protocolo: true,
          status: true,
          tipo_atendimento: true,
          saldo: {
            select: { id: true, descricao: true },
          },
          solicitacao_origem: {
            select: { id: true, protocolo: true },
          },
          reservas: {
            where: { status: 'ATIVA' },
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              id: true,
              valor_estimado: true,
              status: true,
              saldo_id: true,
              created_at: true,
              saldo: {
                select: { id: true, descricao: true },
              },
            },
          },
          custos_planejados: {
            orderBy: { created_at: 'asc' },
            select: {
              id: true,
              tipo: true,
              descricao: true,
              quantidade_dias: true,
              valor: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  })

  if (!processo) {
    return null
  }

  if (
    !assertProcessoAcessivelSetor(
      session.user.role,
      session.user.setorId,
      processo.setor_id
    )
  ) {
    return null
  }

  const solicitacoes = processo.tfd_solicitacoes.map((item) => {
    const custos = item.custos_planejados.map((custo) => ({
      id: custo.id,
      tipo: custo.tipo,
      descricao: custo.descricao,
      quantidadeDias: custo.quantidade_dias,
      valor: Number(custo.valor),
      createdAt: custo.created_at.toISOString(),
      updatedAt: custo.updated_at.toISOString(),
    }))

    const valorTotalEstimado = roundMoney(custos.reduce((acc, custo) => acc + custo.valor, 0))
    const reservaAtiva = item.reservas[0] ?? null

    return {
      solicitacaoId: item.id,
      protocolo: item.protocolo,
      status: item.status,
      tipoAtendimento: item.tipo_atendimento,
      valorTotalEstimado,
      projecaoConfirmada: reservaAtiva !== null,
      solicitacaoOrigem: item.solicitacao_origem
        ? {
            id: item.solicitacao_origem.id,
            protocolo: item.solicitacao_origem.protocolo,
          }
        : null,
      saldoVinculado: item.saldo
        ? { id: item.saldo.id, descricao: item.saldo.descricao }
        : null,
      reservaAtiva: reservaAtiva
        ? {
            id: reservaAtiva.id,
            valor: Number(reservaAtiva.valor_estimado),
            status: reservaAtiva.status,
            saldoId: reservaAtiva.saldo_id,
            saldoDescricao: reservaAtiva.saldo.descricao,
            confirmadaEm: reservaAtiva.created_at.toISOString(),
          }
        : null,
      custos,
    }
  })

  const totalEstimadoProcesso = roundMoney(
    solicitacoes.reduce((acc, item) => acc + item.valorTotalEstimado, 0)
  )

  const totalReservado = roundMoney(
    solicitacoes.reduce((acc, item) => acc + (item.reservaAtiva?.valor ?? 0), 0)
  )

  const solicitacoesComCusto = solicitacoes.filter((item) => item.custos.length > 0).length

  return {
    processoId: processo.id,
    totalEstimadoProcesso,
    totalReservado,
    solicitacoesComCusto,
    solicitacoes,
  }
}
