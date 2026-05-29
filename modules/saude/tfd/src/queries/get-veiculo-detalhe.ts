import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdViagemStatusV2 } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'

const HISTORICO_PER_PAGE = 20

export interface VeiculoViagemHistoricoItem {
  id: string
  protocolo: string
  dataSaida: string
  origemDescricao: string
  destinoDescricao: string
  motoristaNome: string | null
  totalPassageiros: number
  status: TfdViagemStatusV2
}

export interface VeiculoDetalheOutput {
  id: string
  placa: string
  modelo: string
  fabricante: string | null
  ano: number | null
  cor: string | null
  capacidadePassageiros: number
  ativo: boolean
  renavam: string | null
  chassi: string | null
  createdAt: string
  kpis: {
    totalViagens: number
    kmTotal: number
    ocupacaoMedia: number
  }
  historico: {
    items: VeiculoViagemHistoricoItem[]
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

export async function getVeiculoDetalhe(
  veiculoId: string,
  options: { page?: number } = {}
): Promise<VeiculoDetalheOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_FROTA)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const veiculo = await db.tfdVeiculo.findFirst({
    where: {
      id: veiculoId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      placa: true,
      modelo: true,
      fabricante: true,
      ano: true,
      cor: true,
      renavam: true,
      chassi: true,
      capacidade_passageiros: true,
      ativo: true,
      created_at: true,
    },
  })

  if (!veiculo) {
    return null
  }

  const viagemWhere = {
    tenant_id: tenantId,
    veiculo_id: veiculoId,
  }

  const page = Math.max(1, options.page ?? 1)
  const skip = (page - 1) * HISTORICO_PER_PAGE

  const [totalViagens, viagensKm, viagensOcupacao, historicoTotal, historicoRows] =
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
      db.tfdViagem.findMany({
        where: viagemWhere,
        select: {
          passageiros: { select: { acompanhantes_count: true } },
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
          motorista: {
            select: {
              user: { select: { name: true } },
            },
          },
          passageiros: { select: { acompanhantes_count: true } },
        },
        orderBy: [{ data_saida: 'desc' }, { created_at: 'desc' }],
        skip,
        take: HISTORICO_PER_PAGE,
      }),
    ])

  const ocupacoes = viagensOcupacao.map((viagem) => calcTotalPassageiros(viagem.passageiros))
  const ocupacaoMedia =
    ocupacoes.length > 0
      ? Math.round((ocupacoes.reduce((acc, value) => acc + value, 0) / ocupacoes.length) * 10) /
        10
      : 0

  return {
    id: veiculo.id,
    placa: veiculo.placa,
    modelo: veiculo.modelo,
    fabricante: veiculo.fabricante,
    ano: veiculo.ano,
    cor: veiculo.cor,
    capacidadePassageiros: veiculo.capacidade_passageiros,
    ativo: veiculo.ativo,
    renavam: veiculo.renavam,
    chassi: veiculo.chassi,
    createdAt: veiculo.created_at.toISOString(),
    kpis: {
      totalViagens,
      kmTotal: calcKmTotal(viagensKm),
      ocupacaoMedia,
    },
    historico: {
      items: historicoRows.map((row) => ({
        id: row.id,
        protocolo: row.protocolo,
        dataSaida: row.data_saida.toISOString().slice(0, 10),
        origemDescricao: row.origem_descricao,
        destinoDescricao: row.destino_descricao,
        motoristaNome: row.motorista?.user.name ?? null,
        totalPassageiros: calcTotalPassageiros(row.passageiros),
        status: row.status,
      })),
      total: historicoTotal,
      page,
      perPage: HISTORICO_PER_PAGE,
    },
  }
}
