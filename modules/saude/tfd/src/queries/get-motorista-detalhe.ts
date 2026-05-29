import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdViagemStatusV2 } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import { isCnhVencendoEmBreve, isCnhVencida } from '../utils/prazos'

const HISTORICO_PER_PAGE = 20

export interface MotoristaViagemHistoricoItem {
  id: string
  protocolo: string
  dataSaida: string
  origemDescricao: string
  destinoDescricao: string
  veiculo: { placa: string; modelo: string } | null
  totalPassageiros: number
  status: TfdViagemStatusV2
}

export interface MotoristaDetalheOutput {
  id: string
  userId: string
  nome: string
  cns: string | null
  cnh: string
  cnhCategoria: string
  cnhValidade: string
  cnhVencida: boolean
  cnhVencendoEmBreve: boolean
  ativo: boolean
  kpis: {
    totalViagens: number
    kmTotal: number
    totalViagensNoMes: number
  }
  historico: {
    items: MotoristaViagemHistoricoItem[]
    total: number
    page: number
    perPage: number
  }
}

function calcTotalPassageiros(
  passageiros: Array<{ acompanhantes_count: number }>
): number {
  return passageiros.reduce((total, passageiro) => total + 1 + passageiro.acompanhantes_count, 0)
}

function calcKmTotal(viagens: Array<{ km_saida: number | null; km_chegada: number | null }>): number {
  return viagens.reduce((total, viagem) => {
    if (viagem.km_saida !== null && viagem.km_chegada !== null) {
      return total + (viagem.km_chegada - viagem.km_saida)
    }
    return total
  }, 0)
}

function currentMonthRangeUtc(): { inicio: Date; fim: Date } {
  const now = new Date()
  const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const fim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  return { inicio, fim }
}

export async function getMotoristaDetalhe(
  motoristaId: string,
  options: { page?: number } = {}
): Promise<MotoristaDetalheOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_FROTA)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const motorista = await db.tfdMotorista.findFirst({
    where: {
      id: motoristaId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      user_id: true,
      cns: true,
      cnh: true,
      cnh_categoria: true,
      cnh_validade: true,
      ativo: true,
      user: { select: { name: true } },
    },
  })

  if (!motorista) {
    return null
  }

  const viagemWhere = {
    tenant_id: tenantId,
    motorista_id: motoristaId,
  }

  const page = Math.max(1, options.page ?? 1)
  const skip = (page - 1) * HISTORICO_PER_PAGE
  const { inicio: mesInicio, fim: mesFim } = currentMonthRangeUtc()

  const [totalViagens, viagensKm, totalViagensNoMes, historicoTotal, historicoRows] =
    await Promise.all([
      db.tfdViagem.count({ where: viagemWhere }),
      db.tfdViagem.findMany({
        where: {
          ...viagemWhere,
          km_saida: { not: null },
          km_chegada: { not: null },
        },
        select: { km_saida: true, km_chegada: true },
      }),
      db.tfdViagem.count({
        where: {
          ...viagemWhere,
          data_saida: {
            gte: mesInicio,
            lte: mesFim,
          },
        },
      }),
      db.tfdViagem.count({ where: viagemWhere }),
      db.tfdViagem.findMany({
        where: viagemWhere,
        select: {
          id: true,
          protocolo: true,
          data_saida: true,
          origem_descricao: true,
          destino_descricao: true,
          status: true,
          veiculo: {
            select: {
              placa: true,
              modelo: true,
            },
          },
          passageiros: { select: { acompanhantes_count: true } },
        },
        orderBy: [{ data_saida: 'desc' }, { created_at: 'desc' }],
        skip,
        take: HISTORICO_PER_PAGE,
      }),
    ])

  const cnhVencida = isCnhVencida(motorista.cnh_validade)
  const cnhVencendoEmBreve = isCnhVencendoEmBreve(motorista.cnh_validade)

  return {
    id: motorista.id,
    userId: motorista.user_id,
    nome: motorista.user.name,
    cns: motorista.cns,
    cnh: motorista.cnh,
    cnhCategoria: motorista.cnh_categoria,
    cnhValidade: motorista.cnh_validade.toISOString().slice(0, 10),
    cnhVencida,
    cnhVencendoEmBreve,
    ativo: motorista.ativo,
    kpis: {
      totalViagens,
      kmTotal: calcKmTotal(viagensKm),
      totalViagensNoMes,
    },
    historico: {
      items: historicoRows.map((row) => ({
        id: row.id,
        protocolo: row.protocolo,
        dataSaida: row.data_saida.toISOString().slice(0, 10),
        origemDescricao: row.origem_descricao,
        destinoDescricao: row.destino_descricao,
        veiculo: row.veiculo
          ? { placa: row.veiculo.placa, modelo: row.veiculo.modelo }
          : null,
        totalPassageiros: calcTotalPassageiros(row.passageiros),
        status: row.status,
      })),
      total: historicoTotal,
      page,
      perPage: HISTORICO_PER_PAGE,
    },
  }
}
