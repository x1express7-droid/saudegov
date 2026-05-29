import { addDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { getPrismaAdmin } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import { transicionarAgendamentosParaEmViagemNaViagem } from '../utils/sync-agendamentos-viagem-nova'

const MODULO_TFD = 'saude.tfd'
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export interface ProcessarTransicaoViagemNovaErro {
  viagemId: string
  mensagem: string
}

export interface ProcessarTransicaoViagemNovaResult {
  processadas: number
  transicionadas: number
  ignoradas: number
  erros: ProcessarTransicaoViagemNovaErro[]
}

type ViagemCandidataRow = {
  id: string
  tenant_id: string
  data_saida: Date
  hora_saida: Date | null
  protocolo: string
  tenant: { settings: unknown }
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

function formatHoraSaida(horaSaida: Date | null): string | null {
  if (!horaSaida) {
    return null
  }

  const horas = horaSaida.getUTCHours().toString().padStart(2, '0')
  const minutos = horaSaida.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
}

function isViagemProntaParaEmAndamento(
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

  const horaStr = formatHoraSaida(horaSaida)
  const agoraStr = formatInTimeZone(referencia, timezone, 'HH:mm')
  return horaStr !== null && horaStr <= agoraStr
}

/**
 * Job cross-tenant: viagens CONFIRMADA → EM_ANDAMENTO na data/hora de saída (timezone do tenant).
 */
export async function processarTransicaoViagemNova(): Promise<ProcessarTransicaoViagemNovaResult> {
  const db = getPrismaAdmin()
  const agora = new Date()
  const dataLimitePrefiltro = addDays(agora, 1)

  const candidatas = await db.tfdViagem.findMany({
    where: {
      status: 'CONFIRMADA',
      data_saida: { lte: dataLimitePrefiltro },
    },
    select: {
      id: true,
      tenant_id: true,
      data_saida: true,
      hora_saida: true,
      protocolo: true,
      tenant: { select: { settings: true } },
    },
    orderBy: [{ data_saida: 'asc' }, { created_at: 'asc' }],
  })

  const resumo: ProcessarTransicaoViagemNovaResult = {
    processadas: 0,
    transicionadas: 0,
    ignoradas: 0,
    erros: [],
  }

  for (const viagem of candidatas as ViagemCandidataRow[]) {
    const timezone = resolveTenantTimezone(viagem.tenant.settings)

    if (!isViagemProntaParaEmAndamento(viagem.data_saida, viagem.hora_saida, timezone, agora)) {
      continue
    }

    resumo.processadas += 1

    try {
      const resultado = await db.$transaction(async (tx) => {
        const viagemLocked = await tx.tfdViagem.findFirst({
          where: {
            id: viagem.id,
            tenant_id: viagem.tenant_id,
            status: 'CONFIRMADA',
          },
          select: { id: true, protocolo: true },
        })

        if (!viagemLocked) {
          return { tipo: 'ignorada' as const }
        }

        await tx.tfdViagem.update({
          where: { id: viagemLocked.id },
          data: { status: 'EM_ANDAMENTO' },
        })

        const agendamentosAtualizados = await transicionarAgendamentosParaEmViagemNaViagem(tx, {
          tenantId: viagem.tenant_id,
          viagemId: viagemLocked.id,
        })

        return {
          tipo: 'transicionada' as const,
          protocolo: viagemLocked.protocolo,
          agendamentosAtualizados,
        }
      })

      if (resultado.tipo === 'ignorada') {
        resumo.ignoradas += 1
        continue
      }

      await createAuditLog({
        tenantId: viagem.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_viagem',
        entidadeId: viagem.id,
        payloadDepois: {
          status: 'EM_ANDAMENTO',
          protocolo: resultado.protocolo,
          modulo: MODULO_TFD,
          origem: 'job_transicao_viagem_nova',
        },
      })

      for (const agendamento of resultado.agendamentosAtualizados) {
        await createAuditLog({
          tenantId: viagem.tenant_id,
          userId: null,
          acao: 'UPDATE',
          entidade: 'saude_tfd_agendamento',
          entidadeId: agendamento.id,
          payloadAntes: { status: 'AGENDADO' },
          payloadDepois: {
            status: 'EM_VIAGEM',
            sequencia: agendamento.sequencia,
            viagemId: viagem.id,
            modulo: MODULO_TFD,
            origem: 'job_transicao_viagem_nova',
          },
        })
      }

      resumo.transicionadas += 1
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido ao processar viagem.'
      resumo.erros.push({ viagemId: viagem.id, mensagem })
      console.error('[processarTransicaoViagemNova] Erro na viagem:', {
        viagemId: viagem.id,
        tenantId: viagem.tenant_id,
        error: mensagem,
      })
    }
  }

  console.info('[processarTransicaoViagemNova] Resumo:', {
    processadas: resumo.processadas,
    transicionadas: resumo.transicionadas,
    ignoradas: resumo.ignoradas,
    erros: resumo.erros.length,
  })

  return resumo
}
