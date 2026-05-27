import { addDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { getPrismaAdmin } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'

const MODULO_TFD = 'saude.tfd'
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export interface ProcessarTransicaoAgendamentoErro {
  agendamentoId: string
  mensagem: string
}

export interface ProcessarTransicaoAgendamentoResult {
  processadas: number
  transicionadas: number
  ignoradas: number
  erros: ProcessarTransicaoAgendamentoErro[]
}

type AgendamentoTransicaoRow = {
  id: string
  tenant_id: string
  data_consulta: Date
  sequencia: number
  processo_id: string
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

function formatDataConsulta(dataConsulta: Date): string {
  return dataConsulta.toISOString().slice(0, 10)
}

function isDataConsultaChegou(
  dataConsulta: Date,
  timezone: string,
  referencia: Date
): boolean {
  const dataStr = formatDataConsulta(dataConsulta)
  const hojeStr = formatInTimeZone(referencia, timezone, 'yyyy-MM-dd')
  return dataStr <= hojeStr
}

/**
 * Job cross-tenant: na data da consulta (timezone do tenant), transiciona agendamento
 * `AGENDADO` → `EM_VIAGEM` (idempotente por status).
 */
export async function processarTransicaoAgendamento(): Promise<ProcessarTransicaoAgendamentoResult> {
  const db = getPrismaAdmin()
  const agora = new Date()
  const dataLimitePrefiltro = addDays(agora, 1)

  const candidatos = await db.tfdAgendamento.findMany({
    where: {
      status: 'AGENDADO',
      data_consulta: {
        lte: dataLimitePrefiltro,
      },
    },
    select: {
      id: true,
      tenant_id: true,
      data_consulta: true,
      sequencia: true,
      processo_id: true,
      tenant: {
        select: { settings: true },
      },
    },
    orderBy: [{ data_consulta: 'asc' }, { sequencia: 'asc' }],
  })

  const resumo: ProcessarTransicaoAgendamentoResult = {
    processadas: 0,
    transicionadas: 0,
    ignoradas: 0,
    erros: [],
  }

  for (const agendamento of candidatos as AgendamentoTransicaoRow[]) {
    const timezone = resolveTenantTimezone(agendamento.tenant.settings)

    if (!isDataConsultaChegou(agendamento.data_consulta, timezone, agora)) {
      continue
    }

    resumo.processadas += 1

    try {
      const resultado = await db.$transaction(async (tx) => {
        const locked = await tx.tfdAgendamento.findFirst({
          where: {
            id: agendamento.id,
            tenant_id: agendamento.tenant_id,
            status: 'AGENDADO',
          },
          select: {
            id: true,
            sequencia: true,
            data_consulta: true,
          },
        })

        if (!locked) {
          return { tipo: 'ignorada' as const }
        }

        const transicionadoAt = new Date()

        await tx.tfdAgendamento.update({
          where: { id: locked.id },
          data: { status: 'EM_VIAGEM' },
        })

        return {
          tipo: 'transicionada' as const,
          transicionadoAt,
          sequencia: locked.sequencia,
          dataConsultaLabel: formatDataConsulta(locked.data_consulta),
        }
      })

      if (resultado.tipo === 'ignorada') {
        resumo.ignoradas += 1
        continue
      }

      await createAuditLog({
        tenantId: agendamento.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_agendamento',
        entidadeId: agendamento.id,
        payloadAntes: { status: 'AGENDADO' },
        payloadDepois: {
          status: 'EM_VIAGEM',
          sequencia: resultado.sequencia,
          dataConsulta: resultado.dataConsultaLabel,
          modulo: MODULO_TFD,
          origem: 'job_transicao_agendamento',
        },
      })

      resumo.transicionadas += 1
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido ao processar agendamento.'
      resumo.erros.push({ agendamentoId: agendamento.id, mensagem })
      console.error('[processarTransicaoAgendamento] Erro no agendamento:', {
        agendamentoId: agendamento.id,
        tenantId: agendamento.tenant_id,
        error: mensagem,
      })
    }
  }

  console.info('[processarTransicaoAgendamento] Resumo:', {
    processadas: resumo.processadas,
    transicionadas: resumo.transicionadas,
    ignoradas: resumo.ignoradas,
    erros: resumo.erros.length,
  })

  return resumo
}
