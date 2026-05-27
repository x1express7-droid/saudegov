import { addDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { getPrismaAdmin } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'

import { formatHoraConsulta } from '../utils/agendamento-novo'

const MODULO_TFD = 'saude.tfd'
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export interface ProcessarTransicaoTransporteErro {
  transporteId: string
  mensagem: string
}

export interface ProcessarTransicaoTransporteResult {
  processadas: number
  transicionadas: number
  ignoradas: number
  erros: ProcessarTransicaoTransporteErro[]
}

type TransporteTransicaoRow = {
  id: string
  tenant_id: string
  data_saida: Date
  hora_saida: Date | null
  sequencia: number
  agendamento_id: string
  tenant: {
    settings: unknown
  }
}

function resolveTenantTimezone(settings: unknown): string {
  if (typeof settings !== 'object' || settings === null) {
    return DEFAULT_TIMEZONE
  }

  const timezone = (settings as Record<string, unknown>).timezone
  return typeof timezone === 'string' && timezone.trim() !== ''
    ? timezone.trim()
    : DEFAULT_TIMEZONE
}

function formatDataSaida(dataSaida: Date): string {
  return dataSaida.toISOString().slice(0, 10)
}

function isHoraSaidaChegou(
  dataSaida: Date,
  horaSaida: Date | null,
  timezone: string,
  referencia: Date
): boolean {
  const dataStr = formatDataSaida(dataSaida)
  const hojeStr = formatInTimeZone(referencia, timezone, 'yyyy-MM-dd')

  if (dataStr > hojeStr) {
    return false
  }

  if (dataStr < hojeStr) {
    return true
  }

  if (!horaSaida) {
    return true
  }

  const horaSaidaStr = formatHoraConsulta(horaSaida)
  if (!horaSaidaStr) {
    return true
  }

  const agoraHora = formatInTimeZone(referencia, timezone, 'HH:mm')
  return agoraHora >= horaSaidaStr
}

/**
 * Job cross-tenant: segmentos `CONFIRMADO` passam para `EM_TRANSITO` quando
 * `data_saida` e `hora_saida` (se informada) foram atingidas no fuso do tenant.
 */
export async function processarTransicaoTransporte(): Promise<ProcessarTransicaoTransporteResult> {
  const db = getPrismaAdmin()
  const agora = new Date()
  const dataLimitePrefiltro = addDays(agora, 1)

  const candidatos = await db.tfdTransporte.findMany({
    where: {
      status: 'CONFIRMADO',
      data_saida: {
        lte: dataLimitePrefiltro,
      },
    },
    select: {
      id: true,
      tenant_id: true,
      data_saida: true,
      hora_saida: true,
      sequencia: true,
      agendamento_id: true,
      tenant: {
        select: { settings: true },
      },
    },
    orderBy: [{ data_saida: 'asc' }, { sequencia: 'asc' }],
  })

  const resumo: ProcessarTransicaoTransporteResult = {
    processadas: 0,
    transicionadas: 0,
    ignoradas: 0,
    erros: [],
  }

  for (const transporte of candidatos as TransporteTransicaoRow[]) {
    const timezone = resolveTenantTimezone(transporte.tenant.settings)

    if (!isHoraSaidaChegou(transporte.data_saida, transporte.hora_saida, timezone, agora)) {
      continue
    }

    resumo.processadas += 1

    try {
      const resultado = await db.$transaction(async (tx) => {
        const locked = await tx.tfdTransporte.findFirst({
          where: {
            id: transporte.id,
            tenant_id: transporte.tenant_id,
            status: 'CONFIRMADO',
          },
          select: {
            id: true,
            sequencia: true,
            data_saida: true,
          },
        })

        if (!locked) {
          return { tipo: 'ignorada' as const }
        }

        await tx.tfdTransporte.update({
          where: { id: locked.id },
          data: { status: 'EM_TRANSITO' },
        })

        return {
          tipo: 'transicionada' as const,
          sequencia: locked.sequencia,
          dataSaidaLabel: formatDataSaida(locked.data_saida),
        }
      })

      if (resultado.tipo === 'ignorada') {
        resumo.ignoradas += 1
        continue
      }

      await createAuditLog({
        tenantId: transporte.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_transporte',
        entidadeId: transporte.id,
        payloadAntes: { status: 'CONFIRMADO' },
        payloadDepois: {
          status: 'EM_TRANSITO',
          sequencia: resultado.sequencia,
          dataSaida: resultado.dataSaidaLabel,
          agendamentoId: transporte.agendamento_id,
          modulo: MODULO_TFD,
          origem: 'job_transicao_transporte',
        },
      })

      resumo.transicionadas += 1
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido ao processar transporte.'
      resumo.erros.push({ transporteId: transporte.id, mensagem })
      console.error('[processarTransicaoTransporte] Erro no transporte:', {
        transporteId: transporte.id,
        tenantId: transporte.tenant_id,
        error: mensagem,
      })
    }
  }

  console.info('[processarTransicaoTransporte] Resumo:', {
    processadas: resumo.processadas,
    transicionadas: resumo.transicionadas,
    ignoradas: resumo.ignoradas,
    erros: resumo.erros.length,
  })

  return resumo
}
