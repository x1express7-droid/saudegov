import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdTipoViagem, TfdViagemStatusV2 } from '@prisma/client'

import { TFD_PERMISSIONS } from '../permissions'
import { fetchSegmentosViagemForTenant, type SegmentoViagemItem } from './get-segmentos-viagem'

export type { SegmentoViagemItem } from './get-segmentos-viagem'

export interface ViagemPassageiroDetalhe {
  id: string
  agendamentoId: string
  tipoTrecho: TfdTipoViagem
  acompanhantesCount: number
  statusPresenca: string
  agendamento: {
    id: string
    dataConsulta: string
    horaConsulta: string | null
    tipoAtendimento: string
    paciente: { nome: string }
  }
}

export interface ViagemDetalheOutput {
  id: string
  protocolo: string
  status: TfdViagemStatusV2
  dataSaida: string
  horaSaida: string | null
  dataChegada: string | null
  horaChegada: string | null
  kmSaida: number | null
  kmChegada: number | null
  origemDescricao: string
  destinoDescricao: string
  tempoEstimadoMin: number | null
  custoEstimado: string | null
  custoReal: string | null
  observacoes: string | null
  createdAt: string
  updatedAt: string
  veiculo: {
    id: string
    placa: string
    modelo: string
    capacidadePassageiros: number
    ativo: boolean
  } | null
  motorista: {
    id: string
    userId: string
    userNome: string
    cnh: string
    cnhCategoria: string
    cnhValidade: string
    ativo: boolean
  } | null
  passageiros: ViagemPassageiroDetalhe[]
  segmentos: SegmentoViagemItem[]
  tramitacoes: Array<{
    id: string
    tipo: string
    descricao: string
    createdAt: string
    usuarioNome: string | null
  }>
}

function formatHora(hora: Date | null): string | null {
  if (!hora) {
    return null
  }

  const horas = hora.getUTCHours().toString().padStart(2, '0')
  const minutos = hora.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
}

function formatDecimal(value: { toString(): string } | null): string | null {
  return value ? value.toString() : null
}

export async function getViagemDetalhe(viagemId: string): Promise<ViagemDetalheOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.MONITORAR_VIAGEM)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const viagem = await db.tfdViagem.findFirst({
    where: {
      id: viagemId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      protocolo: true,
      status: true,
      data_saida: true,
      hora_saida: true,
      data_chegada: true,
      hora_chegada: true,
      km_saida: true,
      km_chegada: true,
      origem_descricao: true,
      destino_descricao: true,
      tempo_estimado_min: true,
      custo_estimado: true,
      custo_real: true,
      observacoes: true,
      created_at: true,
      updated_at: true,
      veiculo: {
        select: {
          id: true,
          placa: true,
          modelo: true,
          capacidade_passageiros: true,
          ativo: true,
        },
      },
      motorista: {
        select: {
          id: true,
          user_id: true,
          cnh: true,
          cnh_categoria: true,
          cnh_validade: true,
          ativo: true,
          user: { select: { name: true } },
        },
      },
      passageiros: {
        select: {
          id: true,
          agendamento_id: true,
          tipo_trecho: true,
          acompanhantes_count: true,
          status_presenca: true,
          agendamento: {
            select: {
              id: true,
              processo_id: true,
              data_consulta: true,
              hora_consulta: true,
              tipo_atendimento: true,
              solicitacao: {
                select: {
                  paciente: { select: { nome: true } },
                },
              },
            },
          },
        },
        orderBy: [{ agendamento: { data_consulta: 'asc' } }],
      },
    },
  })

  if (!viagem) {
    return null
  }

  // REMOVE-PROCESSO-PARTE-4: tramitações dos processos dos passageiros (agendamentos vinculados)
  const processoIdsTramitacoes = [
    ...new Set(
      viagem.passageiros
        .map((passageiro) => passageiro.agendamento.processo_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const tramitacoes =
    processoIdsTramitacoes.length > 0
      ? await db.tramitacao.findMany({
          where: {
            tenant_id: tenantId,
            processo_id:
              processoIdsTramitacoes.length === 1
                ? processoIdsTramitacoes[0]
                : { in: processoIdsTramitacoes },
          },
          select: {
            id: true,
            tipo: true,
            descricao: true,
            created_at: true,
            usuario: { select: { name: true } },
          },
          orderBy: { created_at: 'desc' },
          take: 10,
        })
      : []

  const segmentos = await fetchSegmentosViagemForTenant(db, tenantId, viagem.id)

  return {
    id: viagem.id,
    protocolo: viagem.protocolo,
    status: viagem.status,
    dataSaida: viagem.data_saida.toISOString().slice(0, 10),
    horaSaida: formatHora(viagem.hora_saida),
    dataChegada: viagem.data_chegada?.toISOString().slice(0, 10) ?? null,
    horaChegada: formatHora(viagem.hora_chegada),
    kmSaida: viagem.km_saida,
    kmChegada: viagem.km_chegada,
    origemDescricao: viagem.origem_descricao,
    destinoDescricao: viagem.destino_descricao,
    tempoEstimadoMin: viagem.tempo_estimado_min,
    custoEstimado: formatDecimal(viagem.custo_estimado),
    custoReal: formatDecimal(viagem.custo_real),
    observacoes: viagem.observacoes,
    createdAt: viagem.created_at.toISOString(),
    updatedAt: viagem.updated_at.toISOString(),
    veiculo: viagem.veiculo
      ? {
          id: viagem.veiculo.id,
          placa: viagem.veiculo.placa,
          modelo: viagem.veiculo.modelo,
          capacidadePassageiros: viagem.veiculo.capacidade_passageiros,
          ativo: viagem.veiculo.ativo,
        }
      : null,
    motorista: viagem.motorista
      ? {
          id: viagem.motorista.id,
          userId: viagem.motorista.user_id,
          userNome: viagem.motorista.user.name,
          cnh: viagem.motorista.cnh,
          cnhCategoria: viagem.motorista.cnh_categoria,
          cnhValidade: viagem.motorista.cnh_validade.toISOString().slice(0, 10),
          ativo: viagem.motorista.ativo,
        }
      : null,
    passageiros: viagem.passageiros.map((passageiro) => ({
      id: passageiro.id,
      agendamentoId: passageiro.agendamento_id,
      tipoTrecho: passageiro.tipo_trecho,
      acompanhantesCount: passageiro.acompanhantes_count,
      statusPresenca: passageiro.status_presenca,
      agendamento: {
        id: passageiro.agendamento.id,
        dataConsulta: passageiro.agendamento.data_consulta.toISOString().slice(0, 10),
        horaConsulta: formatHora(passageiro.agendamento.hora_consulta),
        tipoAtendimento: passageiro.agendamento.tipo_atendimento,
        paciente: { nome: passageiro.agendamento.solicitacao.paciente.nome },
      },
    })),
    segmentos,
    tramitacoes: tramitacoes.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      descricao: row.descricao,
      createdAt: row.created_at.toISOString(),
      usuarioNome: row.usuario?.name ?? null,
    })),
  }
}
