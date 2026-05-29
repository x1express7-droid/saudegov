'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import { isCnhVencida } from '../utils/prazos'
import {
  parseDataConsultaUtc,
  parseHoraConsultaUtc,
} from '../utils/agendamento-novo'
import { verificaCapacidadeVeiculo } from '../utils/viagem'
import {
  cancelarTransporteSchema,
  confirmarTransporteSchema,
  criarSegmentoTransporteSchema,
  registrarChegadaSchema,
} from '../validators/transporte.schema'

const MODULO_TFD = 'saude.tfd'

const MSG_AGENDAMENTO_NAO_ENCONTRADO = 'Agendamento não encontrado.'
const MSG_VIAGEM_NAO_ENCONTRADA = 'Viagem não encontrada.'
const MSG_STATUS_AGENDAMENTO_INVALIDO =
  'O agendamento precisa estar com status Agendado ou Em viagem para incluir transporte.'
const MSG_STATUS_VIAGEM_INVALIDO =
  'A viagem precisa estar Planejada, Confirmada ou Em andamento para incluir segmentos.'
const MSG_VEICULO_NAO_ENCONTRADO = 'Veículo não encontrado ou inativo.'
const MSG_MOTORISTA_NAO_ENCONTRADO = 'Motorista não encontrado ou inativo.'
const MSG_CAPACIDADE_INSUFICIENTE =
  'A capacidade do veículo não comporta o paciente e o acompanhante necessário.'
const MSG_CNH_INVALIDA = 'A CNH do motorista está vencida na data de saída informada.'
const MSG_TRANSPORTE_NAO_ENCONTRADO = 'Segmento de transporte não encontrado.'
const MSG_STATUS_CONFIRMAR_INVALIDO =
  'Somente segmentos com status Pendente podem ser confirmados.'
const MSG_STATUS_CHEGADA_INVALIDO =
  'A chegada só pode ser registrada para segmentos Confirmados ou Em trânsito.'
const MSG_STATUS_CANCELAR_INVALIDO =
  'Não é possível cancelar segmentos em trânsito ou já concluídos.'
const MSG_ANEXO_NAO_ENCONTRADO = 'Anexo não encontrado.'

class TransporteBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TransporteBusinessError'
  }
}

function revalidateAgendamentoPaths(processoId: string, agendamentoId: string): void {
  revalidatePath('/saude/tfd/agendamentos')
  revalidatePath(`/saude/tfd/processos/${processoId}/agendamentos/${agendamentoId}`)
}

function revalidateViagemPaths(viagemId: string): void {
  revalidatePath('/saude/tfd/viagens')
  revalidatePath(`/saude/tfd/viagens/${viagemId}`)
}

function revalidateTransporteContext(transporte: {
  agendamento: { id: string; processo_id: string } | null
  viagem: { id: string } | null
}): void {
  if (transporte.agendamento) {
    revalidateAgendamentoPaths(transporte.agendamento.processo_id, transporte.agendamento.id)
  }
  if (transporte.viagem) {
    revalidateViagemPaths(transporte.viagem.id)
  }
}

export interface CriarSegmentoTransporteOutput {
  transporteId: string
  sequencia: number
}

export async function criarSegmentoTransporte(
  rawInput: unknown
): Promise<ActionResponse<CriarSegmentoTransporteOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_TRANSPORTE)

  const parsed = criarSegmentoTransporteSchema.safeParse(rawInput)
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

    let agendamentoId: string | null = null
    let viagemId: string | null = null
    let processoIdRevalidate: string | null = null
    let capacidadeOcupacao = 1
    let acompanhanteNecessario = false

    if (data.agendamentoId) {
      const agendamento = await db.tfdAgendamento.findFirst({
        where: {
          id: data.agendamentoId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          processo_id: true,
          status: true,
          solicitacao: {
            select: { acompanhante_necessario: true },
          },
        },
      })

      if (!agendamento) {
        return { success: false, error: MSG_AGENDAMENTO_NAO_ENCONTRADO }
      }

      if (agendamento.status !== 'AGENDADO' && agendamento.status !== 'EM_VIAGEM') {
        return { success: false, error: MSG_STATUS_AGENDAMENTO_INVALIDO }
      }

      agendamentoId = agendamento.id
      processoIdRevalidate = agendamento.processo_id
      acompanhanteNecessario = agendamento.solicitacao.acompanhante_necessario
      capacidadeOcupacao = 1 + (acompanhanteNecessario ? 1 : 0)
    } else if (data.viagemId) {
      const viagem = await db.tfdViagem.findFirst({
        where: {
          id: data.viagemId,
          tenant_id: tenantId,
        },
        select: {
          id: true,
          status: true,
          passageiros: {
            select: { acompanhantes_count: true },
          },
        },
      })

      if (!viagem) {
        return { success: false, error: MSG_VIAGEM_NAO_ENCONTRADA }
      }

      if (
        viagem.status !== 'PLANEJADA' &&
        viagem.status !== 'CONFIRMADA' &&
        viagem.status !== 'EM_ANDAMENTO'
      ) {
        return { success: false, error: MSG_STATUS_VIAGEM_INVALIDO }
      }

      viagemId = viagem.id
      capacidadeOcupacao = viagem.passageiros.reduce(
        (total, passageiro) => total + 1 + passageiro.acompanhantes_count,
        0
      )
      if (capacidadeOcupacao === 0) {
        capacidadeOcupacao = 1
      }
      acompanhanteNecessario = viagem.passageiros.some(
        (passageiro) => passageiro.acompanhantes_count > 0
      )
    }

    let veiculoId: string | null = null
    let motoristaId: string | null = null

    if (data.tipoSegmento === 'TERRESTRE_PROPRIO') {
      const veiculo = await db.tfdVeiculo.findFirst({
        where: {
          id: data.veiculoId!,
          tenant_id: tenantId,
          ativo: true,
        },
        select: {
          id: true,
          capacidade_passageiros: true,
        },
      })

      if (!veiculo) {
        return { success: false, error: MSG_VEICULO_NAO_ENCONTRADO }
      }

      const capacidadeOk = viagemId
        ? veiculo.capacidade_passageiros >= capacidadeOcupacao
        : verificaCapacidadeVeiculo(veiculo.capacidade_passageiros, acompanhanteNecessario)

      if (!capacidadeOk) {
        return { success: false, error: MSG_CAPACIDADE_INSUFICIENTE }
      }

      const motorista = await db.tfdMotorista.findFirst({
        where: {
          id: data.motoristaId!,
          tenant_id: tenantId,
          ativo: true,
        },
        select: {
          id: true,
          cnh_validade: true,
        },
      })

      if (!motorista) {
        return { success: false, error: MSG_MOTORISTA_NAO_ENCONTRADO }
      }

      const dataReferenciaCnh = parseDataConsultaUtc(data.dataSaida)
      if (isCnhVencida(motorista.cnh_validade, dataReferenciaCnh)) {
        return { success: false, error: MSG_CNH_INVALIDA }
      }

      veiculoId = veiculo.id
      motoristaId = motorista.id
    }

    const dataSaidaDb = parseDataConsultaUtc(data.dataSaida)
    const horaSaidaDb = parseHoraConsultaUtc(data.horaSaida)
    const dataChegadaDb = data.dataChegada ? parseDataConsultaUtc(data.dataChegada) : null
    const horaChegadaDb = parseHoraConsultaUtc(data.horaChegada)

    const resultado = await db.$transaction(async (tx) => {
      const maxSequencia = await tx.tfdTransporte.aggregate({
        where: {
          tenant_id: tenantId,
          ...(agendamentoId ? { agendamento_id: agendamentoId } : { viagem_id: viagemId! }),
        },
        _max: { sequencia: true },
      })
      const sequencia = (maxSequencia._max.sequencia ?? 0) + 1

      const transporte = await tx.tfdTransporte.create({
        data: {
          tenant_id: tenantId,
          agendamento_id: agendamentoId,
          viagem_id: viagemId,
          sequencia,
          tipo_segmento: data.tipoSegmento,
          veiculo_id: veiculoId,
          motorista_id: motoristaId,
          origem_descricao: data.origemDescricao,
          destino_descricao: data.destinoDescricao,
          data_saida: dataSaidaDb,
          hora_saida: horaSaidaDb,
          data_chegada: dataChegadaDb,
          hora_chegada: horaChegadaDb,
          custo_estimado: data.custoEstimado ?? null,
          responsavel_pagamento: data.responsavelPagamento,
          observacoes: data.observacoes ?? null,
          status: 'PENDENTE',
        },
        select: {
          id: true,
          sequencia: true,
        },
      })

      return transporte
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_transporte',
      entidadeId: resultado.id,
      payloadDepois: {
        agendamentoId,
        viagemId,
        sequencia: resultado.sequencia,
        tipoSegmento: data.tipoSegmento,
        modulo: MODULO_TFD,
      },
    })

    if (processoIdRevalidate && agendamentoId) {
      revalidateAgendamentoPaths(processoIdRevalidate, agendamentoId)
    }
    if (viagemId) {
      revalidateViagemPaths(viagemId)
    }

    return {
      success: true,
      data: {
        transporteId: resultado.id,
        sequencia: resultado.sequencia,
      },
    }
  } catch (error) {
    console.error('[criarSegmentoTransporte] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível criar o segmento de transporte.' }
  }
}

export async function confirmarTransporte(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_TRANSPORTE)

  const parsed = confirmarTransporteSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const transporte = await db.tfdTransporte.findFirst({
      where: {
        id: parsed.data.transporteId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        agendamento: {
          select: {
            id: true,
            processo_id: true,
          },
        },
        viagem: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!transporte) {
      return { success: false, error: MSG_TRANSPORTE_NAO_ENCONTRADO }
    }

    if (transporte.status !== 'PENDENTE') {
      return { success: false, error: MSG_STATUS_CONFIRMAR_INVALIDO }
    }

    await db.tfdTransporte.update({
      where: { id: transporte.id },
      data: { status: 'CONFIRMADO' },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_transporte',
      entidadeId: transporte.id,
      payloadAntes: { status: 'PENDENTE' },
      payloadDepois: { status: 'CONFIRMADO', modulo: MODULO_TFD },
    })

    revalidateTransporteContext(transporte)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[confirmarTransporte] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível confirmar o transporte.' }
  }
}

export async function registrarChegadaTransporte(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_TRANSPORTE)

  const parsed = registrarChegadaSchema.safeParse(rawInput)
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

    const transporte = await db.tfdTransporte.findFirst({
      where: {
        id: data.transporteId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        data_chegada: true,
        hora_chegada: true,
        km_chegada: true,
        agendamento: {
          select: {
            id: true,
            processo_id: true,
          },
        },
        viagem: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!transporte) {
      return { success: false, error: MSG_TRANSPORTE_NAO_ENCONTRADO }
    }

    if (transporte.status !== 'CONFIRMADO' && transporte.status !== 'EM_TRANSITO') {
      return { success: false, error: MSG_STATUS_CHEGADA_INVALIDO }
    }

    const dataChegadaDb = data.dataChegada
      ? parseDataConsultaUtc(data.dataChegada)
      : transporte.data_chegada
    const horaChegadaDb = data.horaChegada
      ? parseHoraConsultaUtc(data.horaChegada)
      : transporte.hora_chegada

    await db.tfdTransporte.update({
      where: { id: transporte.id },
      data: {
        status: 'CONCLUIDO',
        km_chegada: data.kmChegada ?? transporte.km_chegada,
        data_chegada: dataChegadaDb,
        hora_chegada: horaChegadaDb,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_transporte',
      entidadeId: transporte.id,
      payloadAntes: { status: transporte.status },
      payloadDepois: {
        status: 'CONCLUIDO',
        kmChegada: data.kmChegada ?? transporte.km_chegada,
        modulo: MODULO_TFD,
      },
    })

    revalidateTransporteContext(transporte)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[registrarChegadaTransporte] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível registrar a chegada do transporte.' }
  }
}

export async function cancelarTransporte(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_TRANSPORTE)

  const parsed = cancelarTransporteSchema.safeParse(rawInput)
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

    const transporte = await db.tfdTransporte.findFirst({
      where: {
        id: data.transporteId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        observacoes: true,
        agendamento: {
          select: {
            id: true,
            processo_id: true,
          },
        },
        viagem: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!transporte) {
      return { success: false, error: MSG_TRANSPORTE_NAO_ENCONTRADO }
    }

    if (transporte.status !== 'PENDENTE' && transporte.status !== 'CONFIRMADO') {
      return { success: false, error: MSG_STATUS_CANCELAR_INVALIDO }
    }

    const observacoesCancelamento = transporte.observacoes
      ? `${transporte.observacoes}\n\n[CANCELADO] ${data.motivo}`
      : `[CANCELADO] ${data.motivo}`

    await db.tfdTransporte.update({
      where: { id: transporte.id },
      data: {
        status: 'CANCELADO',
        observacoes: observacoesCancelamento,
      },
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_transporte',
      entidadeId: transporte.id,
      payloadAntes: { status: transporte.status },
      payloadDepois: {
        status: 'CANCELADO',
        motivo: data.motivo,
        modulo: MODULO_TFD,
      },
    })

    revalidateTransporteContext(transporte)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[cancelarTransporte] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível cancelar o transporte.' }
  }
}

const adicionarAnexoTransporteSchema = z.object({
  transporteId: z.string().uuid('ID do transporte inválido.'),
  anexoId: z.string().uuid('ID do anexo inválido.'),
  tipoAnexo: z
    .string()
    .trim()
    .max(50, 'Tipo de anexo inválido.')
    .optional()
    .default('OUTRO'),
})

export async function adicionarAnexoTransporte(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_TRANSPORTE)

  const parsed = adicionarAnexoTransporteSchema.safeParse(rawInput)
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

    const transporte = await db.tfdTransporte.findFirst({
      where: {
        id: data.transporteId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        agendamento: {
          select: {
            id: true,
            processo_id: true,
          },
        },
        viagem: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!transporte) {
      return { success: false, error: MSG_TRANSPORTE_NAO_ENCONTRADO }
    }

    const anexo = await db.anexo.findFirst({
      where: {
        id: data.anexoId,
        tenant_id: tenantId,
      },
      select: { id: true },
    })

    if (!anexo) {
      return { success: false, error: MSG_ANEXO_NAO_ENCONTRADO }
    }

    const registro = await db.$transaction(async (tx) => {
      await tx.anexo.update({
        where: { id: anexo.id },
        data: { confirmado: true },
      })

      return tx.tfdTransporteAnexo.create({
        data: {
          tenant_id: tenantId,
          transporte_id: transporte.id,
          anexo_id: anexo.id,
          tipo_anexo: data.tipoAnexo,
        },
        select: { id: true },
      })
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_transporte_anexo',
      entidadeId: registro.id,
      payloadDepois: {
        transporteId: transporte.id,
        anexoId: anexo.id,
        tipoAnexo: data.tipoAnexo,
        modulo: MODULO_TFD,
      },
    })

    revalidateTransporteContext(transporte)

    return { success: true, data: { id: registro.id } }
  } catch (error) {
    if (error instanceof TransporteBusinessError) {
      return { success: false, error: error.message }
    }
    console.error('[adicionarAnexoTransporte] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível adicionar o anexo ao transporte.' }
  }
}
